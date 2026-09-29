"""Add fcm_tokens table

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-09-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5d6e7f8a9b0'
down_revision = 'b4c5d6e7f8a9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'fcm_tokens',
        sa.Column('id',         sa.Integer(),     nullable=False),
        sa.Column('user_id',    sa.Integer(),     nullable=False),
        sa.Column('token',      sa.Text(),        nullable=False),
        sa.Column('platform',   sa.String(20),    nullable=False, server_default='web'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
    )
    op.create_index('ix_fcm_tokens_user_id', 'fcm_tokens', ['user_id'], unique=False)


def downgrade():
    op.drop_index('ix_fcm_tokens_user_id', table_name='fcm_tokens')
    op.drop_table('fcm_tokens')
