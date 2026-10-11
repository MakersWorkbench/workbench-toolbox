# Sources and verification record

This file records where the tables and values in the Component Marking Decoder were checked, and where a value could not be confirmed or differs between manufacturers. The audit was done in October 2026. If you find a mistake, please open an issue and cite the datasheet or standard.

**How to read the status column.** *Confirmed* means a published source agreed with the value. *Varies* means different manufacturers publish different values, and the tool says so. *Unverified* means I could not find a published source, so the tool either hedges the wording or leaves the entry out.

## Color codes and tables

| Item | Status | Source |
|---|---|---|
| E96 value list (EIA-96 codes 01 to 96) | Confirmed. The 96 values match the published list. | [Wikipedia, E series of preferred numbers](https://en.wikipedia.org/wiki/E_series_of_preferred_numbers) |
| E24 value list | Confirmed | Same source |
| EIA-96 multiplier letters | Confirmed against common references | [SMD resistor code reference, xDevs](https://xdevs.com/guide/rescode/) |
| Resistor color digits, multipliers, tolerance colors | Confirmed | [Wikipedia, Electronic color code (IEC 60062)](https://en.wikipedia.org/wiki/Electronic_color_code) |
| Resistor temperature coefficient colors (black 250, brown 100, red 50, orange 15, yellow 25, green 20, blue 10, violet 5, grey 1 ppm/K) | Confirmed. A few references leave green and grey blank. | [Panasonic resistor technical page](https://industrial.panasonic.com/tw/ds/ss/technical/b27) |
| Inductor color band tolerance (brown 1, red 2, gold 5, silver 10, no band 20 percent) | Confirmed for these four. Other colors were removed because no source supported them. | [Inductor color code reference](https://www.electronics2000.co.uk/calc/inductor-code-calculator.php) |

## Capacitors

| Item | Status | Source |
|---|---|---|
| 3-digit code and multiplier digits (8 = x0.01, 9 = x0.1) | Confirmed | [QSL.net capacitor codes](https://qsl.net/yo5ofh/doc/capacitors.htm) |
| Tolerance letters B, C, D, F, G, H, J, K, M, P, Z | Confirmed for D through Z. B and C follow the common EIA table. | [Electronics Notes capacitor codes](https://www.electronics-notes.com/articles/electronic_components/capacitors/capacitor-codes-markings.php) |
| EIA-198 two-character letters | Confirmed against the DigiKey reference, which lists lowercase a as 2.6. Some other tables show 2.5, so the tool says so. | [DigiKey, Surface Mount Capacitors and their Markings](https://forum.digikey.com/t/surface-mount-capacitors-and-their-markings/30122) |
| EIA two-character voltage codes (0E, 0G, 0L, 0J, 1A through 1U, 2A through 2K) | Confirmed. The earlier 1K = 80 V entry was wrong and was removed. The 0K and 3A codes were not confirmed and are not included. | DigiKey reference above and Electronics Notes |
| Tantalum voltage letters (e 2.5, G 4, J 6.3, A 10, C 16, D 20, E 25, V 35, T 50 or H 50) | Confirmed. Makers use T or H for 50 V, so both are accepted. | [Kyocera AVX TAJ datasheet](https://datasheets.kyocera-avx.com/TAJ_ESCC.pdf) and Electronics Notes |
| Tantalum polarity (stripe or bevel marks positive) | Confirmed. One infographic reviewed during development showed the opposite, and it was disregarded. | Manufacturer datasheets |

## Varistors, thermistors, fuses, ferrites, pots

| Item | Status | Source |
|---|---|---|
| 14D471K = 14 mm disc, 470 V, K = +/-10 percent, 300 V AC, 385 V DC | Confirmed | [Bourns MOV-14D471K at DigiKey](https://www.digikey.at/en/products/detail/bourns-inc/MOV-14D471K/2799087), [Bourns MOV-10D datasheet](https://bourns.com/docs/product-datasheets/mov-10dxxxkc.pdf) |
| S14K275 = 275 V AC, 350 V DC, 430 V | Confirmed | [TDK S14K275 listing](https://www.ozdisan.com/en/p/varistors-863/epcos-tdk-s14k275-355923) |
| Varistor tolerance letters other than K | Unverified. Only K is accepted; other letters are flagged. | Bourns datasheet lists K only |
| AC rating about 0.64 and DC rating about 0.82 times the 1 mA varistor voltage | Derived from the catalog values above and stated as an estimate | Same sources |
| Clamping range 1.6 to 1.8 times varistor voltage | Estimate. One listing gives 775 V for the 14D471K. | Distributor listing for the 14D471K |
| Fuse breaking capacity H 1500 A, E 150 A, L 35 A or 10 times rated current | Confirmed | [Littelfuse 5x20 mm IEC fuse cap marking guide](https://m.littelfuse.com/~/media/files/littelfuse/technical-resources/documents/reference-documents/littelfuse_5x20mm-iec-fuse-cap-marking_guide.pdf), Bel 5HT datasheets |
| Fuse speed codes FF, F, M, T, TT | Confirmed | Littelfuse guide above |
| Semitec 103AT-2: 10 kohm at 25 C, B25/85 = 3435 K | Confirmed | [Semitec 103AT-2 at DigiKey](https://forum.digikey.com/t/semitec-ntc-103at-2/18380) |
| Potentiometer taper letters (A log, B linear, C reverse log in Asia and the US; Europe differs) | Confirmed, with the regional difference stated | [Wikipedia, Potentiometer](https://en.wikipedia.org/wiki/Potentiometer) |
| Murata BLM size codes 15 = 0402, 18 = 0603, 21 = 0805, 41 = 1806 | Confirmed. Other size codes were removed as unverified. | [Murata BL series breakdown](https://forum.digikey.com/t/murata-ferrite-bead-bl-series-part-number-breakdown/733) and distributor listings |

## Crystals, resonators, and filters

| Item | Status | Source |
|---|---|---|
| 10.7 MHz ceramic filter dot colors (black 10.64, blue 10.67, red 10.70, orange 10.73, white 10.76 MHz) | Confirmed against Murata catalog data | [Murata SFE10.7MA catalog data](https://www.alldatasheet.net/html-pdf/1424494/MURATA1/SFECF10M7GF00-R0/8943/25/SFECF10M7GF00-R0.html) |
| Murata CSTLS series meaning (3-terminal leaded, built-in capacitors) and M as the decimal point (16M0 = 16.0 MHz) | Confirmed. The tolerance and load capacitance characters are not decoded. | Murata CSTLS distributor listings |
| Crystal load capacitor formula CL = C1 x C2 / (C1 + C2) + stray | Standard formula. The 4 pF stray value is an assumption and is stated. | General practice |

## SMD marking codes

| Marking | Part | Status |
|---|---|---|
| A7, A4, A6 | BAV99, BAV70, BAS16 | Confirmed ([Farnell BA-series datasheet](https://www.farnell.com/datasheets/2182684.pdf) and distributor listings) |
| 1E, 1F, 1G and 3E, 3F, 3G | BC847A/B/C and BC857A/B/C | Confirmed ([Nexperia BC847 series](https://nexperia.com/group/bc847x-series)). BC857B 3F confirmed; 3E and 3G follow the same pattern. |
| 1P | MMBT2222A | Confirmed ([Nexperia PMBT2222A datasheet](https://static.chipdip.ru/lib/429/DOC012429960.pdf)) |
| T4 | 1N4148W (SOD-123) | Confirmed in several datasheets |
| L4, L42, L43, L44 | BAT54, A, C, S | Partly supported (distributor and reference lists). Makers add prefixes. |
| 1AM | MMBT3904 | Used by some makers. Diodes Inc. uses a different code. Varies. |
| 2A | MMBT3906 | Reported, not confirmed in a datasheet. Varies. |
| A09T, A19T | AO3400A, AO3401A | Third-party sources only. Varies. |
| M7 | SMA 1 A 1000 V rectifier | The marking is the part name. |

## Semiconductor ratings

Ratings and pinouts in `js/parts-data.js` are typical values from the manufacturer datasheets and distributor listings found during the audit. Where manufacturers differ, the entry says so. Notable cases:

| Part | What differs |
|---|---|
| 2N3904, BC547, PN2222A, S8050 and S8550 | TO-92 pin order differs between manufacturers (for example BC547 is C-B-E at Fairchild and onsemi, E-B-C at NXP). The entries state each order. |
| 2N7000 and BS170 | Drain and source order differs between datasheet revisions and makers. |
| PN2222A | Maximum collector current is 600 mA at NXP and 1 A at Fairchild. |
| AMS1117 | Dropout and maximum input voltage differ across makers (about 12 to 30 V listed). The tool does not state a single value. |
| LM317 | The tool states a range for the input to output difference. |
| ATmega328P | 40 mA per pin is the absolute maximum. The 20 mA figure is a board-vendor convention, not a Microchip specification, and the entry says so. |
| FQP30N06L | onsemi lists last shipments, so the entry notes availability. |
| 1N4148 | Continuous current is 200 mA in the NXP datasheet and 300 mA elsewhere. |
| BAT54 | Forward current is 200 mA at Diodes Inc. and 300 mA in the ST datasheet. |

## Not verified from a primary source

These came from general knowledge or secondary summaries and are worded cautiously or flagged:

- The exact value of lowercase `a` in EIA-198 (2.6 per DigiKey, 2.5 in some tables).
- Murata ceramic resonator tolerance and load capacitance characters after the frequency field.
- The LM2596 5-pin pin numbering (stated with a prompt to confirm).
- MCP1700 pin order per package (the entry tells you to check the datasheet).
- AO3400A exact on-resistance and threshold ranges (listings disagree).
