# @polerix/atlantic-date-core

Canadian statutory holiday calculation, Atlantic timezone boundary handling, deterministic seasonal item rotations, and 5x5 Bingo generation.

Extracted from [Squarewatch](https://github.com/polerix/Squarewatch).

## Installation

```bash
npm install @polerix/atlantic-date-core
```

## Highlights

- Handles Daylight Saving Time boundaries specifically for `America/Halifax` (Atlantic Time).
- Computes variable statutory holidays (e.g. Victoria Day, Labour Day, Thanksgiving, Good Friday/Easter).
- Deterministic pseudorandom daily picks from item pools based on string date.
- 5x5 Bingo card generator with standard center FREE space and line-win evaluator.
