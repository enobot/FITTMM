"""Firebase accounts, profile and weight history, exercise library, video cache

Revision ID: a7c3e5f9b2d1
Revises: e901f4c62dd8
Create Date: 2026-10-27

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7c3e5f9b2d1"
down_revision: Union[str, Sequence[str], None] = "e901f4c62dd8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EXERCISE_LIBRARY_COLUMNS = [
    ("category", sa.String(length=50)),
    ("equipment", sa.String(length=50)),
    ("level", sa.String(length=20)),
    ("force", sa.String(length=20)),
    ("mechanic", sa.String(length=20)),
    ("primary_muscles", sa.JSON()),
    ("secondary_muscles", sa.JSON()),
    ("instructions", sa.JSON()),
    ("images", sa.JSON()),
]


def _columns(insp, table):
    return {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    # The app's startup create_all() may already have made the new tables,
    # so every step checks what exists first.
    insp = sa.inspect(op.get_bind())
    tables = set(insp.get_table_names())

    user_cols = _columns(insp, "users")
    with op.batch_alter_table("users") as batch:
        batch.alter_column("email", existing_type=sa.String(length=50),
                           type_=sa.String(length=255), existing_nullable=False)
        batch.alter_column("password_hash", existing_type=sa.String(length=100),
                           nullable=True)
        batch.alter_column("date_of_birth", existing_type=sa.Date(), nullable=True)
        if "firebase_uid" not in user_cols:
            batch.add_column(sa.Column("firebase_uid", sa.String(length=128), nullable=True))
            batch.create_index("ix_users_firebase_uid", ["firebase_uid"], unique=True)
        if "goal_weight" not in user_cols:
            batch.add_column(sa.Column("goal_weight", sa.Float(), nullable=True))
        if "unit_system" not in user_cols:
            batch.add_column(sa.Column("unit_system", sa.String(length=10),
                                       nullable=False, server_default="imperial"))

    ex_cols = _columns(insp, "exercises")
    with op.batch_alter_table("exercises") as batch:
        batch.alter_column("name", existing_type=sa.String(length=50),
                           type_=sa.String(length=100), existing_nullable=False)
        if "slug" not in ex_cols:
            batch.add_column(sa.Column("slug", sa.String(length=100), nullable=True))
            batch.create_index("ix_exercises_slug", ["slug"], unique=True)
        for name, col_type in EXERCISE_LIBRARY_COLUMNS:
            if name not in ex_cols:
                batch.add_column(sa.Column(name, col_type, nullable=True))

    if "weight_entries" not in tables:
        op.create_table(
            "weight_entries",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("userid", sa.Integer(), nullable=False),
            sa.Column("weight", sa.Float(), nullable=False),
            sa.Column("recorded_on", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False,
                      server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["userid"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_weight_entries_id", "weight_entries", ["id"])
        op.create_index("ix_weight_entries_userid", "weight_entries", ["userid"])

    if "video_cache" not in tables:
        op.create_table(
            "video_cache",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("query", sa.String(length=200), nullable=False),
            sa.Column("fetched_at", sa.DateTime(), nullable=False),
            sa.Column("results", sa.JSON(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_video_cache_id", "video_cache", ["id"])
        op.create_index("ix_video_cache_query", "video_cache", ["query"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_video_cache_query", table_name="video_cache")
    op.drop_index("ix_video_cache_id", table_name="video_cache")
    op.drop_table("video_cache")
    op.drop_index("ix_weight_entries_userid", table_name="weight_entries")
    op.drop_index("ix_weight_entries_id", table_name="weight_entries")
    op.drop_table("weight_entries")

    with op.batch_alter_table("exercises") as batch:
        for name, _ in reversed(EXERCISE_LIBRARY_COLUMNS):
            batch.drop_column(name)
        batch.drop_index("ix_exercises_slug")
        batch.drop_column("slug")
        batch.alter_column("name", existing_type=sa.String(length=100),
                           type_=sa.String(length=50), existing_nullable=False)

    with op.batch_alter_table("users") as batch:
        batch.drop_column("unit_system")
        batch.drop_column("goal_weight")
        batch.drop_index("ix_users_firebase_uid")
        batch.drop_column("firebase_uid")
        batch.alter_column("date_of_birth", existing_type=sa.Date(), nullable=False)
        batch.alter_column("password_hash", existing_type=sa.String(length=100),
                           nullable=False)
        batch.alter_column("email", existing_type=sa.String(length=255),
                           type_=sa.String(length=50), existing_nullable=False)
