from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import select
from app.core.config import settings
import datetime

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    # Import models here to ensure they are registered with Base before create_all
    from app.models.telemetry import TelemetryRecord  # noqa: F401
    from app.models.inventory import Inventory  # noqa: F401
    from app.models.weather_raw import RawNPDCFile  # noqa: F401
    from app.models.weather import WeatherObservation  # noqa: F401
    from app.models.weather_anomaly import WeatherAnomalyRecord  # noqa: F401
    from app.models.user import User  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed inventory if empty
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Inventory))
        if not result.scalars().first():
            bharati_inv = Inventory(
                station_id="BHARATI",
                fuel_liters=14200,
                fuel_capacity=20000,
                food_days=92,
                medical_supplies_days=120,
                spare_parts_count=48,
                atf_liters=5000,
                last_resupply="2024-11-15",
                updated_at=datetime.datetime.utcnow()
            )
            maitri_inv = Inventory(
                station_id="MAITRI",
                fuel_liters=10000,
                fuel_capacity=15000,
                food_days=60,
                medical_supplies_days=90,
                spare_parts_count=30,
                atf_liters=2000,
                last_resupply="2024-10-10",
                updated_at=datetime.datetime.utcnow()
            )
            session.add_all([bharati_inv, maitri_inv])
            await session.commit()

    # Seed demo researcher account if no users exist
    async with AsyncSessionLocal() as session:
        from app.models.user import User
        import bcrypt

        result = await session.execute(select(User))
        if not result.scalars().first():
            salt = bcrypt.gensalt()
            hashed_pwd = bcrypt.hashpw("polar2026".encode("utf-8")[:72], salt).decode("utf-8")
            demo_user = User(
                full_name="Dr. Polar Researcher",
                email="researcher@polar.res.in",
                institution="NCPOR",
                hashed_password=hashed_pwd,
                is_active=True,
            )
            session.add(demo_user)
            await session.commit()
            print("[DB] Demo researcher account seeded: researcher@polar.res.in / polar2026")
