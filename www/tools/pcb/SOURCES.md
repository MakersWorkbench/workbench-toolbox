# Sources and constants


## Trace width

IPC-2221: I = k × ΔT^0.44 × A^0.725, with I in amps, ΔT in °C, A in square mils, k = 0.048 (external) or 0.024 (internal). Copper weight: 1 oz = 1.378 mil (35 µm). IPC-2152 is the newer standard and may give different results for a given board. The IPC-2221 curves cover up to about 35 A.

## Trace resistance

R = ρ × L ÷ (w × t), copper ρ = 1.724 × 10⁻⁸ Ω·m at 20 °C, temperature coefficient 0.00393 per °C.

## Via current

Barrel cross-section = π ÷ 4 × (D² − (D − 2t)²), then the IPC-2221 internal conductor formula with k = 0.024. This is an estimate; published via data is limited.

## Trace spacing

IPC-2221 Table 6-1, minimum spacing in mm for DC or peak voltage (values to be confirmed against the standard before relying on them):

| Up to (V) | Internal | External uncoated | External coated |
| --- | --- | --- | --- |
| 15 | 0.05 | 0.1 | 0.13 |
| 30 | 0.05 | 0.1 | 0.13 |
| 50 | 0.1 | 0.6 | 0.13 |
| 100 | 0.1 | 0.6 | 0.13 |
| 150 | 0.2 | 0.6 | 0.4 |
| 170 | 0.2 | 1.25 | 0.4 |
| 250 | 0.2 | 1.25 | 0.4 |
| 300 | 0.2 | 1.25 | 0.4 |
| 500 | 0.25 | 2.5 | 0.8 |

## Wire gauge

Diameter = 0.127 mm × 92^((36 − n) ÷ 39) (ASTM B258). Copper resistivity 1.724 × 10⁻⁸ Ω·m at 20 °C.
