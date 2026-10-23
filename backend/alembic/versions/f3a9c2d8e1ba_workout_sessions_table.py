"""workout_sessions table

Revision ID: f3a9c2d8e1ba
Revises: 2e3d363f4097
Create Date: 2026-05-05

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a9c2d8e1ba"
down_revision: Union[str, Sequence[str], None] = "2e3d363f4097"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workout_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("userid", sa.Integer(), nullable=False),
        sa.Column(
            "logged_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["userid"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workout_sessions_id"), "workout_sessions", ["id"], unique=False)
    op.create_index(
        op.f("ix_workout_sessions_userid"), "workout_sessions", ["userid"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_workout_sessions_userid"), table_name="workout_sessions")
    op.drop_index(op.f("ix_workout_sessions_id"), table_name="workout_sessions")
    op.drop_table("workout_sessions")
