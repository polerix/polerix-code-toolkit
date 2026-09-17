# @polerix/navigation-math

Pure spherical geometry, bearing calculation, route sampling, and vector steering math.

Extracted from [SpinnerCockpit](https://github.com/polerix/SpinnerCockpit).

## Installation

```bash
npm install @polerix/navigation-math
```

## Functions

- `distance(a, b)`: Distance in metres between two `[lon, lat]` points on the spherical Earth.
- `bearing(a, b)`: Initial compass bearing in radians from point `a` to point `b`.
- `makeRoute(points)`: Pre-computes segment lengths and total distance for a polyline route.
- `sampleRoute(route, travelMeters)`: Interpolates position `(lon, lat, heading)` at a distance along the route.
- `movePosition(lon, lat, heading, meters)`: Projects a coordinate forward by heading and distance.
- `turnToward(current, target, limit)`: Interpolates angular steering toward target with a turn rate limit.
