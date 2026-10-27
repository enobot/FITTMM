"""exercise body_part column

Revision ID: d4e8f1a02bc7
Revises: f3a9c2d8e1ba
Create Date: 2026-05-05

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e8f1a02bc7"
down_revision: Union[str, Sequence[str], None] = "f3a9c2d8e1ba"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("body_part", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("exercises", "body_part")
