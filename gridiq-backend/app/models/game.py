from sqlalchemy import String, DateTime, Integer, Float, Boolean, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    game_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # NFL's game ID
    season: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    week: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    
    # Teams
    home_team: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    away_team: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    
    # Scores
    home_score: Mapped[int] = mapped_column(Integer, nullable=True)
    away_score: Mapped[int] = mapped_column(Integer, nullable=True)
    
    # Metadata
    game_date: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False)
    stadium: Mapped[str] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    plays: Mapped[list["Play"]] = relationship("Play", back_populates="game", cascade="all, delete-orphan")


class Play(Base):
    __tablename__ = "plays"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    game_id: Mapped[str] = mapped_column(String(50), nullable=False)
    play_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    
    # Quarter and time
    quarter: Mapped[int] = mapped_column(Integer, nullable=False)
    minute: Mapped[int] = mapped_column(Integer, nullable=True)
    second: Mapped[int] = mapped_column(Integer, nullable=True)
    
    # Team and personnel
    posteam: Mapped[str] = mapped_column(String(10), index=True, nullable=True)  # Possession team
    defteam: Mapped[str] = mapped_column(String(10), index=True, nullable=True)  # Defense team
    
    # Play description and type
    play_description: Mapped[str] = mapped_column(Text, nullable=True)
    play_type: Mapped[str] = mapped_column(String(50), index=True, nullable=True)  # "pass", "rush", etc.
    
    # Yards and scores
    yards_gained: Mapped[int] = mapped_column(Integer, nullable=True)
    yards_to_go: Mapped[int] = mapped_column(Integer, nullable=True)
    down: Mapped[int] = mapped_column(Integer, nullable=True)
    
    # Advanced metrics
    epa: Mapped[float] = mapped_column(Float, nullable=True)  # Expected Points Added
    wpa: Mapped[float] = mapped_column(Float, nullable=True)  # Win Probability Added
    air_yards: Mapped[float] = mapped_column(Float, nullable=True)
    yards_after_catch: Mapped[float] = mapped_column(Float, nullable=True)
    
    # Outcomes
    touchdown: Mapped[bool] = mapped_column(Boolean, nullable=True)
    interception: Mapped[bool] = mapped_column(Boolean, nullable=True)
    fumble: Mapped[bool] = mapped_column(Boolean, nullable=True)
    
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Foreign key would go here but we're denormalizing for performance
    # game: Mapped["Game"] = relationship("Game", back_populates="plays")
