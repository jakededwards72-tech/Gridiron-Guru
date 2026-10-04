# Gridiron Guru

Player-prop-first NFL prediction and betting intelligence engine.

## Product doctrine
1. Project the player before reading the sportsbook price.
2. Model opportunity before efficiency.
3. Model the entire game so player outcomes remain correlated.
4. Separate projection, probability, fair price, market edge and confidence.
5. Never unlock Best Bets before walk-forward backtesting and calibration.
6. Every historical feature must respect an as-of cutoff to prevent look-ahead bias.

## Data architecture
Planned sources include nflverse play-by-play/player stats/snap counts/rosters, injury and depth-chart data, weather/venue context, Next Gen Stats where legitimately accessible, and a licensed sportsbook odds/prop feed.

## Modeling roadmap
Availability -> role/opportunity -> efficiency -> matchup interaction -> game environment -> correlated Monte Carlo -> calibration -> market comparison.

Current UI uses clearly labeled demonstration lines only. It does not issue betting recommendations from placeholder data.

## Run
npm install
npm run dev

## Deploy
Vercel: framework Vite; build command npm run build; output dist.
