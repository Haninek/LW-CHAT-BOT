from alembic import op
import sqlalchemy as sa

revision = "uwizard_events_dealid"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table("events") as b:
        b.add_column(sa.Column("tenant_id", sa.String(), nullable=True))
        b.add_column(sa.Column("deal_id", sa.String(), nullable=True))
    op.create_index("ix_events_tenant_id", "events", ["tenant_id"])
    op.create_index("ix_events_deal_id", "events", ["deal_id"])

    # best-effort backfill from JSON payload
    conn = op.get_bind()
    dialect = conn.dialect.name
    if dialect == "postgresql":
        conn.execute(sa.text("""
          UPDATE events SET deal_id = COALESCE(deal_id, (data->>'deal_id'))
        """))
    else:
        # sqlite / mysql json_extract
        conn.execute(sa.text("""
          UPDATE events SET deal_id = COALESCE(deal_id, json_extract(data, '$.deal_id'))
        """))

def downgrade():
    op.drop_index("ix_events_deal_id", table_name="events")
    op.drop_index("ix_events_tenant_id", table_name="events")
    with op.batch_alter_table("events") as b:
        b.drop_column("deal_id")
        b.drop_column("tenant_id")