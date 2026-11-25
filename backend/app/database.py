from pathlib import Path
import os

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

database_url = make_url(settings.DATABASE_URL)

if database_url.drivername == "mysql":
    database_url = database_url.set(drivername="mysql+pymysql")

connect_args = {}

if (database_url.host or "").endswith(".tidbcloud.com"):
    ca_path = (
        Path(__file__).resolve().parent.parent
        / "certs"
        / "isrgrootx1.pem"
    )

    if not ca_path.is_file():
        raise RuntimeError("TiDB CA certificate is missing")

    connect_args = {
        "ssl_ca": str(ca_path),
        "ssl_verify_cert": True,
        "ssl_verify_identity": True,
    }

if database_url.drivername.startswith("mysql"):
    connect_args.update(connect_timeout=10, read_timeout=20, write_timeout=20)

pool_options = {"poolclass": NullPool} if os.getenv("VERCEL") else {"pool_recycle": 300}

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
    **pool_options,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()