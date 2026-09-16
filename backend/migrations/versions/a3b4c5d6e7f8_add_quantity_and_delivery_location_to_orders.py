"""Add quantity and delivery_location to orders

Revision ID: a3b4c5d6e7f8
Revises: 911370570968
Create Date: 2026-09-16 19:44:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3b4c5d6e7f8'
down_revision = '911370570968'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('quantity', sa.Integer(), server_default='1', nullable=False))
        batch_op.add_column(sa.Column('delivery_location', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_column('delivery_location')
        batch_op.drop_column('quantity')
