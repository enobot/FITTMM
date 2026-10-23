"""Ensure exercises.userid (and image) exist — repairs DBs that skipped 2e3d363f4097.

Revision ID: e901f4c62dd8
Revises: d4e8f1a02bc7
Create Date: 2026-05-05

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e901f4c62dd8"
down_revision: Union[str, Sequence[str], None] = "d4e8f1a02bc7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_NAME = "fk_exercises_userid_users"


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    cols = {c["name"] for c in insp.get_columns("exercises")}

    if "userid" not in cols:
        op.add_column(
            "exercises",
            sa.Column("userid", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            FK_NAME,
            "exercises",
            "users",
            ["userid"],
            ["id"],
        )

    if "image" not in cols:
        op.add_column(
            "exercises",
            sa.Column("image", sa.String(length=500), nullable=True),
        )

    if "body_part" not in cols:
        op.add_column(
            "exercises",
            sa.Column("body_part", sa.String(length=50), nullable=True),
        )


def downgrade() -> None:
    """Only undo userid/FK added under FK_NAME (skip if column came from an older migration)."""
    insp = sa.inspect(op.get_bind())
    fk_names = {fk["name"] for fk in insp.get_foreign_keys("exercises")}
    if FK_NAME in fk_names:
        op.drop_constraint(FK_NAME, "exercises", type_="foreignkey")
        op.drop_column("exercises", "userid")
