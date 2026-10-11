# Sources and constants


## Linear regulator thermal

Power = (Vin − Vout) × I + Vin × Iq. Efficiency = Vout × I ÷ (Vin × (I + Iq)). Junction temperature = ambient + P × θJA. Required heatsink θSA = (Tjmax − Ta) ÷ P − θJC − θCS. Standard thermal-resistance model (junction, case, sink, ambient), as described in regulator datasheets (for example the LM317 and 78xx families).

## Capacitor discharge

V(t) = V0 × e^(−t ÷ RC), so t = RC × ln(V0 ÷ V). Energy = ½CV². Standard RC discharge.

## Battery pack

Series adds voltage, parallel adds capacity; energy = nominal voltage × Ah; current = C-rate × capacity. Typical per-cell voltages: Li-ion/LiPo 3.7 / 4.2 / 3.0 V; LiFePO4 3.2 / 3.65 / 2.5 V; NiMH 1.2 / 1.45 / 1.0 V; alkaline 1.5 / 1.6 / 0.9 V; lead-acid 2.0 / 2.35 / 1.75 V per cell. These are typical figures to be confirmed against the cell datasheet.

## Battery life

Average current = (Ia × ta + Is × ts) ÷ (ta + ts). Switching regulator: Ibat = Iload × Vout ÷ (Vbat × efficiency) + Iq. Linear regulator: Ibat = Iload + Iq.

## Filter capacitor

Ripple ≈ I ÷ (f × C), with f equal to twice the mains frequency for full-wave rectification. Standard capacitor-input filter approximation.
