-- 001_enums.sql - All PostgreSQL enum types

CREATE TYPE sport_type AS ENUM ('baseball', 'softball');

CREATE TYPE team_level AS ENUM (
    'little_league', 'high_school', 'college',
    'minor_league', 'travel', 'rec'
);

CREATE TYPE bats_type AS ENUM ('left', 'right', 'switch');
CREATE TYPE throws_type AS ENUM ('left', 'right');

CREATE TYPE game_status AS ENUM (
    'scheduled', 'in_progress', 'final', 'suspended', 'cancelled'
);

CREATE TYPE at_bat_result AS ENUM (
    'single', 'double', 'triple', 'home_run',
    'walk', 'hit_by_pitch', 'intentional_walk',
    'strikeout_swinging', 'strikeout_looking',
    'ground_out', 'fly_out', 'line_out', 'pop_out',
    'fielders_choice', 'double_play', 'triple_play',
    'sacrifice_fly', 'sacrifice_bunt',
    'reached_on_error', 'catchers_interference'
);
