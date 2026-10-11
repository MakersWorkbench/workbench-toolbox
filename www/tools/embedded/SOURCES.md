# Sources and constants

## ADC

Counts = Vin ÷ Vref × 2^n (floor), or ÷ (2^n − 1) with rounding. The Arduino reference documents `analogRead()` as 0 to 1023 on 10-bit boards. The ESP32 accuracy note (about 0.15 to 2.45 V at 11 dB attenuation) follows Espressif's ADC documentation. Check your chip revision.

## ADC divider

Vout = Vin × R2 ÷ (R1 + R2), searched over IEC 60063 E-series values. The AVR recommendation of about 10 kΩ or less source impedance is from the ATmega328P datasheet's ADC section.

## PWM

Period = 1 ÷ f, on time = duty × period, average = high level × duty. A first-order RC filter with cutoff f ÷ 10 attenuates the carrier by about 20 dB (single pole, one decade above the cutoff).

## Logic levels

Typical datasheet values, to be confirmed against your exact part:

| Family | Supply | VOH min | VOL max | VIH min | VIL max | Abs max input | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATmega328P | 5 V | 4.0 V | 0.9 V | 0.6 × Vcc = 3.0 V | 0.3 × Vcc = 1.5 V | Vcc + 0.5 V | Microchip AVR DC characteristics: VIL 0.3 × Vcc and VIH 0.6 × Vcc for Vcc 2.4 to 5.5 V; VOH and VOL at 20 mA, Vcc 5 V, 85 °C. Confirm in the ATmega328P datasheet. |
| ESP32 | 3.3 V | 0.8 × VDD = 2.64 V | 0.1 × VDD = 0.33 V | 0.75 × VDD = 2.475 V | 0.25 × VDD = 0.825 V | about 3.6 V (VDD + 0.3 V) | Espressif ESP32 datasheet, DC characteristics at VDD 3.3 V; pins are not 5 V tolerant |
| 5 V TTL | 5 V | 2.7 V | 0.4 V | 2.0 V | 0.8 V | 5.5 V | Standard TTL levels (74LS) |
| 74HCT | 5 V | 4.4 V | 0.1 V | 2.0 V | 0.8 V | Vcc + 0.5 V | TTL-compatible CMOS inputs |
| 74HC / CD4000 | 5 V | 4.4 V | 0.1 V | 3.5 V | 1.5 V | Vcc + 0.5 V | CMOS thresholds at 5 V |
| 3.3 V LVTTL | 3.3 V | 2.4 V | 0.4 V | 2.0 V | 0.8 V | 3.6 V | JEDEC LVTTL levels |

Verdict rules: danger if the driver's supply exceeds the receiver's maximum input; level shifter needed if the high or low margin is negative; marginal under 0.2 V of margin; otherwise compatible.

## UART (AVR)

UBRR = fclk ÷ (16 × baud) − 1 in normal mode, fclk ÷ (8 × baud) − 1 in double-speed mode, rounded; actual baud = fclk ÷ (16 × (UBRR + 1)). From the ATmega328P datasheet, USART section. At 16 MHz, 115200 baud gives −3.5 % error in normal mode and +2.1 % with U2X.

## AVR timers (CTC mode)

f = fclk ÷ (prescaler × (OCR + 1)). Prescalers: Timer0 and Timer1 1, 8, 64, 256, 1024; Timer2 1, 8, 32, 64, 128, 256, 1024. Timer0 and Timer2 are 8-bit (OCR up to 255), Timer1 is 16-bit (up to 65535). ATmega328P datasheet.
