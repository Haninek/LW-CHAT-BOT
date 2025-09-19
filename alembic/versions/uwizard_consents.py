from alembic import op
import sqlalchemy as sa

revision = "uwizard_consents"
down_revision = "uwizard_documents_s3"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "consents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("merchant_id", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),  # "sms"
        sa.Column("status", sa.String(), nullable=False),   # "opt_in" | "opt_out"
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_consents_phone", "consents", ["phone"], unique=True)

def downgrade():
    op.drop_index("ix_consents_phone", table_name="consents")
    op.drop_table("consents")