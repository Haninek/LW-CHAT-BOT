from alembic import op
import sqlalchemy as sa

revision = "uwizard_documents_s3"
down_revision = "uwizard_events_dealid"
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table("bank_documents") as b:
        b.add_column(sa.Column("storage_key", sa.String(), nullable=True))
        b.add_column(sa.Column("bucket", sa.String(), nullable=True))
        b.add_column(sa.Column("checksum", sa.String(), nullable=True))
        # optional: keep filename/path columns; drop file_data if you had it:
        # b.drop_column("file_data")

def downgrade():
    with op.batch_alter_table("bank_documents") as b:
        # b.add_column(sa.Column("file_data", sa.LargeBinary(), nullable=True))
        b.drop_column("checksum"); b.drop_column("bucket"); b.drop_column("storage_key")