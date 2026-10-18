# VietNamTrip Data Schema

## 1. Purpose

This document defines the data structure used by the VietNamTrip project. The schema is shared by all team members and should not be changed without team agreement.

## 2. provinces.json

Each element represents one province.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | Yes | Unique province ID, lowercase, without Vietnamese accents, using hyphens between words. |
| `name` | String | Yes | Province name displayed to users, with Vietnamese accents. |
| `terrain_primary` | String | Yes | Primary terrain: `forest`, `coast`, `island`, `delta`, `mountain`, `urban`, or `karst`. |
| `terrain_secondary` | String or null | No | Secondary terrain type. |
| `map_color` | String | Yes | Hex color used when the province is unlocked, e.g. `#2E7D4F`. |
| `center` | Array of numbers | Yes | Map center coordinates in `[latitude, longitude]` order. |
| `bbox` | Array of numbers | Yes | Bounding box in `[minLon, minLat, maxLon, maxLat]` order. |
| `puzzle_image` | String | Yes | Path to the image used by the 3×3 puzzle. |
| `is_demo` | Boolean | Yes | Whether the province belongs to the seven-province demo set. |
| `source` | String | Yes | Source of the province data. |
| `last_verified` | String (YYYY-MM-DD) | Yes | Date the data was last verified. |

## 3. pois.json

Each element represents a point of interest (POI).

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | Yes | Unique POI ID. |
| `name` | String | Yes | Name of the point of interest. |
| `province_id` | String | Yes | ID of the province containing this POI; must exist in `provinces.json`. |
| `type` | String | Yes | One of `attraction`, `restaurant`, `lodging`, `hospital`, `pharmacy`, `transport_hub`, `shop`, or `experience`. |
| `lat` | Number | Yes | Latitude of the POI; must be within the province bounding box. |
| `lon` | Number | Yes | Longitude of the POI; must be within the province bounding box. |
| `opening_hours` | Object | Yes | Opening hours for `mon` through `sun`; each value is a time range such as `07:00-17:00` or `closed`. |
| `visit_minutes` | Object | Conditional | Required for attractions; contains `short` and `long` visit durations in minutes. |
| `price_vnd` | Positive number | Yes | Price in Vietnamese dong (VND). |
| `tags` | Array of strings | Yes | Descriptive tags, e.g. `indoor`, `outdoor`, `family-friendly`, `step-free`, `vegetarian-friendly`. |
| `difficulty` | String or null | Conditional | Required for attractions; one of `easy`, `moderate`, `hard`, or `null`. |
| `popularity` | Number from 0 to 1 | No | Popularity value used by the scoring system. |
| `source` | String | Yes | Source of the POI information. |
| `last_verified` | String (YYYY-MM-DD) | Yes | Date the POI data was last verified. |

Prices and opening hours older than 12 months must be flagged for review.

## 4. edges.json

Each element represents an undirected connection between two POIs. Each connection is stored only once.

| Field | Type | Description |
|---|---|---|
| `from` | String | ID of the starting POI. |
| `to` | String | ID of the connected POI. |
| `minutes` | Number | Travel time between the two POIs, in minutes. |
| `km` | Number | Distance between the two POIs, in kilometers. |
| `cost_vnd` | Number | Travel cost in Vietnamese dong (VND). |

## 5. context.json

Each element represents contextual information for one province in one month.

| Field | Type | Description |
|---|---|---|
| `province_id` | String | ID of the province; must match `provinces.json`. |
| `month` | Integer from 1 to 12 | Month represented by the record. |
| `avg_temp_c` | Number | Average temperature in degrees Celsius. |
| `rain_mm` | Number | Rainfall in millimeters. |
| `season` | String | Season information. |
| `storm_flood_risk` | String or number | Storm and flood risk information. |
| `crowd_level` | String | Crowd level information. |
| `price_level` | String | Price level information. |

## 6. boundaries.geojson

This file contains province boundaries in standard GeoJSON format.

- Each feature represents one province.
- `properties.id` must match the corresponding `id` in `provinces.json`.
- `geometry` must use `Polygon` or `MultiPolygon`.
- Boundary data must come from a suitable geographic source.

## 7. Data validation rules

1. All IDs must be consistent across related files.
2. Every `province_id` in `pois.json` and `context.json` must exist in `provinces.json`.
3. Every POI must have a `source` and `last_verified` date.
4. POI coordinates must be within the province bounding box.
5. POI prices must be positive.
6. Popularity must be between 0 and 1 when provided.
7. Each edge must connect valid POI IDs and must be stored only once.
8. Province boundary IDs must match province IDs exactly.
9. Changes to this schema require team agreement.