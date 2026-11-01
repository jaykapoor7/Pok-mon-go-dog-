# Photography in the launch film

Downloaded from Pexels (free for commercial use under the Pexels licence; no attribution required). Not committed: run the fetch below into `public/px/`.

| File | Pexels photo |
|---|---|
| 34754503.jpg (her) | https://www.pexels.com/photo/charming-street-dog-in-uttarakhand-india-34754503/ |
| 30315845.jpg (neon rain street) | https://www.pexels.com/photo/urban-street-scene-at-night-with-neon-lights-30315845/ |
| 35131834.jpg (rainy night reflections) | https://www.pexels.com/photo/rainy-night-street-scene-with-reflections-35131834/ |
| 28737040.jpg (Howrah Bridge at night) | https://www.pexels.com/photo/night-view-of-howrah-bridge-in-kolkata-india-28737040/ |
| 10538901.jpg (aerial rooftops) | https://www.pexels.com/photo/drone-shot-of-city-buildings-10538901/ |
| 11742771.jpg (phone, city lights) | https://www.pexels.com/photo/street-photography-using-a-mobile-phone-camera-11742771/ |
| 30935680, 35112437, 32797704, 20776972, 29372969, 17663165 (wall) | https://www.pexels.com/photo/ followed by the id |

`pinky.jpg` is StrayPaw's own photo (`public/pinky-bengaluru.jpg`).

```bash
for id in 34754503 30315845 35131834 28737040 10538901 11742771 30935680 35112437 32797704 20776972 29372969 17663165; do curl -sS -o public/px/$id.jpg "https://images.pexels.com/photos/$id/pexels-photo-$id.jpeg?auto=compress&cs=tinysrgb&w=2000"; done
```
