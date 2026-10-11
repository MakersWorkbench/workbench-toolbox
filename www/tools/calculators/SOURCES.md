# Sources and constants

Every formula, table, and constant in the calculators, and where it comes from. Checked when the tool was written. If you find an error, please open an issue.

## Preferred-number series

E6, E12, E24, E48, and E96 follow IEC 60063. E48 is every other E96 value. The test suite checks the series lengths (6, 12, 24, 48, 96).

## Ohm's law and power

V = I × R, P = V × I = I²R = V²/R. Recommended resistor rating is the next standard size (1/8, 1/4, 1/2, 1, 2, 3, 5, 10, 25, 50, 100 W) at least 2× the dissipation, a common 50 % derating rule of thumb.

## LED resistor

R = (Vs − n × Vf) ÷ I for LEDs in series, and one resistor per LED in parallel. Rounds up to the next standard value so current does not exceed the target.

## Voltage divider

Vout = Vin × R2 ÷ (R1 + R2). Output impedance is R1 ∥ R2. Loaded output replaces R2 with R2 ∥ Rload.

## Series and parallel

Series resistors and parallel capacitors add. Parallel resistors and series capacitors combine as 1 ÷ (1/a + 1/b + ...).

## RC filter and reactance

τ = RC, f_c = 1 ÷ (2πRC), 10 to 90 % rise time 2.2τ. X_L = 2πfL, X_C = 1 ÷ (2πfC), f₀ = 1 ÷ (2π√(LC)).

## 555 timer

Astable: f = 1.44 ÷ ((R1 + 2×R2) × C), high time 0.693 × (R1 + R2) × C, low time 0.693 × R2 × C. Monostable: T = 1.1 × R × C. Standard formulas from the 555 datasheets (Texas Instruments NE555, SE555).

## LM317

Vout = 1.25 V × (1 + R2 ÷ R1) + I_ADJ × R2, with a typical I_ADJ of 50 µA and about 3 V of dropout headroom. From the Texas Instruments LM317 datasheet.

## Wire gauge

Diameter = 0.127 mm × 92^((36 − n) ÷ 39) (ASTM B258). Resistance uses the resistivity of annealed copper, 1.724 × 10⁻⁸ Ω·m at 20 °C (22 AWG works out to 0.6438 mm and about 52.96 Ω per km). Using 1.678 × 10⁻⁸ Ω·m instead lowers results by about 3 %. This is not an ampacity table.

## I²C pull-up

Maximum: R ≤ t_r ÷ (0.8473 × C_b), where 0.8473 is the RC time from 30 % to 70 % of VDD. Minimum: R ≥ (VDD − V_OL) ÷ I_OL. Limits from the NXP I²C-bus specification (UM10204): t_r of 1000 / 300 / 120 ns, C_b of 400 / 400 / 550 pF, and I_OL of 3 / 3 / 20 mA for Standard, Fast, and Fast-mode Plus. V_OL is 0.4 V (0.2 × VDD when VDD is 2 V or below).

## Battery life

Average current = active × duty + sleep × (1 − duty). Run time = capacity × usable fraction ÷ average current. Self-discharge, temperature, and cut-off voltage are not modeled.

## BJT switch

Base current = load current ÷ forced beta (10 is the usual choice). Rb = (V_drive − V_BE) ÷ I_B, rounded down to an E24 value.
