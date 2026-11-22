# Mortgage Calculator – Requirements

## 1. Overview

A fully client-side mortgage calculator that models a loan over its lifetime as a timeline of events, so users can see the total cost of a mortgage with multiple transactions applied.

## 2. Technical Constraints

### 2.1 Architecture

- Fully client-side; no backend, and no network calls required for any calculation.
- Written in TypeScript with React.
- UI built entirely with MUI.

### 2.2 Persistence and Sharing

- The application does **not** persist data. No local storage, cookies, IndexedDB, or accounts. Reloading the page without a shared link starts from a blank state.
- The application offers a **shareable link**: the full timeline data (loan definition and all events) is encoded in the URL.
- Opening a shareable link reconstructs the timeline entirely from the URL.
- The timeline data is encoded as **base64** in the URL. The payload is the **JSON representation of the app state**, which is then base64 encoded.
- There is **no limit** on URL length.
- **Invalid data is ignored** when loading a link, and is **removed from the URL** so the address bar reflects only the data that was actually loaded.

### 2.3 Browser Support

- Must work in all browsers, desktop and mobile.

### 2.4 Accessibility

- Must be compatible with screen readers.
- This includes the timeline and its event nodes, which must be understandable and operable without sight or a pointer.

### 2.5 Deployment

- Deployed as a static site to GitHub Pages, continuing to use the existing `gh-pages` workflow (`npm run deploy`).

### 2.6 Testing

- **Unit tests are required** for:
  - the calculation logic (amortization and the effect of each event type), and
  - the timeline logic (event ordering, positioning, and validation).
- **No UI tests** and **no integration tests**. UI components are not covered by automated tests.
- Use the simplest test framework that fits the toolchain. **Vitest** is the choice, as it reuses the existing Vite config and needs no extra setup.
- Tests run in the **pre-commit hook** (via the existing Husky setup); a failing test blocks the commit.

## 4. Loan Definition (Initial Loan)

The loan definition is the starting point of the timeline. It describes a single **fixed-rate** mortgage; adjustable-rate mortgages are not supported.

### 4.1 Inputs

| Field             | Description                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purchase price    | Price of the property.                                                                                                                             |
| Down payment      | Amount paid upfront, deducted from the purchase price. Entered either as a sum or as a percentage of the purchase price.                           |
| Interest rate     | Fixed annual interest rate for the loan.                                                                                                           |
| Term              | Length of the loan, entered in months. The equivalent in years and months is displayed next to the field (e.g. 366 months → "30 years, 6 months"). |
| Start date        | Date the loan begins.                                                                                                                              |
| Payment frequency | How often payments are made: monthly, bi-weekly, accelerated bi-weekly, or weekly.                                                                 |

### 4.2 Calculated Values

- **Loan value** = purchase price − down payment. It is displayed to the user and is not directly editable.

### 4.3 Validation

- No validation is applied to loan inputs.

### 4.4 Down Payment Behavior

- The sum and percentage forms are kept in sync: editing one automatically updates the other.
- Both forms are stored in the app state (and therefore in the shared link).

### 4.5 Default Values

A new loan starts with simple round defaults:

| Field             | Default                                 |
| ----------------- | --------------------------------------- |
| Purchase price    | $500,000                                |
| Down payment      | $100,000 (20%)                          |
| Interest rate     | 5%                                      |
| Term              | 360 months (30 years)                   |
| Start date        | Today's date (the moment the app loads) |
| Payment frequency | Monthly                                 |

### 4.6 Open Questions

- _TBD_: interest compounding and payment calculation convention.

### 4.7 Out of Scope

- Taxes, insurance, PMI, HOA, and fees are not part of the loan definition.

## 5. Timeline

### 5.1 Concept

The timeline represents the lifetime of the loan. Events are placed along it and visualized as nodes.

### 5.2 Layout

- The timeline is a **vertical line**.
- The **top** represents the origination of the loan; the **bottom** represents the end of the loan.
- Items are arranged top to bottom in chronological order: the loan origination, then each event, then the loan end.
- The loan origination (the loan start) is **not an event**. It is always first on the timeline, cannot be moved, deleted or dragged, and is defined by the loan definition (section 4).
- Each event is shown as a node on the line.

### 5.3 Adding Events

- Every **line segment between two adjacent items** has an **add button** (a plus sign) at the center of the segment. This includes the segment between origination and the first event, between each pair of events, and between the last event and the loan end. With no events, a single add button sits between origination and the loan end.
- Clicking the add button opens a **ring of options arranged in a circle around the button**. Each option is one event type: recast, lump sum payment, extra regular payment, refinance, and change payment frequency.
- Clicking an option **adds that event** at the position of the segment that was clicked, and **closes the ring**.
- The ring can be **dismissed without choosing** an option by clicking the add button again, clicking elsewhere, or pressing Escape.
- **Only one ring can be open at a time**. Opening a ring closes any other that is open.
- **Small screens and viewport edges**: on mobile, or when the ring would not fit near the edge of the viewport, the options are shown as a **vertical list** instead of a ring. The list is spaced so that all options are visible.
- **Accessibility**: the options are screen reader compatible and navigable with the keyboard, in both the ring and the list presentation. This includes opening and dismissing the ring, moving between options, and choosing one.

### 5.4 Event Cards

- Each event is shown as a **rounded rectangle** (card) on the timeline.
- Each card shows the **fields appropriate to its event type** (see section 6), and **all fields are editable** in place.
- Every card has a **delete icon in its top right corner**. Clicking it removes the event from the timeline.

### 5.5 Event Dates and Ordering

- Every event has a **start / occurrence date**.
- An event's date **must be later than the dates of the events before it** in the timeline. _See open question on same-day events below._
- Events are **inserted in chronological order**.
- Events that occur on the **same day** are shown **next to each other**. Their order is set by the user (via drag and drop) or, by default, by creation order.
- A newly added event's **default date is one day after the previous event**. For the first event, the previous item is the loan start, so the default is one day after the loan start date (assumed).
- A date that **breaks the chronological ordering is flagged** on the card. **Calculations are not attempted** while any date is out of order; they resume once it is fixed. Dates are not automatically re-sorted or rejected on edit.

### 5.6 Rearranging Events

- Event cards can be **dragged and dropped** to rearrange them.
- Rearranging **automatically changes the event's date** based on the direction it was dragged:
  - dragged **after** another event: the date becomes the **day after** that event;
  - dragged **before** another event: the date becomes the **day before** that event.

### 5.7 Invalid Events (After Payoff)

- Events that occur **after the loan is paid off are ignored** in all calculations.
- They are **marked invalid**: the card has a **red border** and shows a **warning message** stating that the event is after payoff.
- Invalid events remain on the timeline and can still be edited, moved or deleted.

### 5.8 Line Tooltip

- Mousing over the timeline line shows a **tooltip** with:
  - the **payment amount** (the per-payment amount, labeled with the payment frequency; see 7.5),
  - the **remaining balance**,
  - the **time until payoff**, and
  - the **total cost of the loan**.
- Each value is shown with its **comparison to the baseline** (the loan with no events, see 7.6), as defined in 7.5.
- The values are for the **point in time the hovered line segment represents**: after the last event above the segment has been applied and before the next event below it. All four values, including total cost, are as of that point; hovering different segments shows different values.
- If **all** of the values are invalid or not being calculated (e.g. calculations are paused because of an out-of-order date, see 5.5), the tooltip is **not shown at all**. It is shown only if at least one value is available. _TBD_: how individual unavailable values are displayed when others are available.

### 5.9 Timeline Summary

- The **bottom of the timeline** (the loan end) shows a **summary** of the final costs of the loan with all events applied:
  - the **total cost** of the loan,
  - the **total interest cost**,
  - the **payoff date**, displayed as the date of the final payment (see 7.7), and
  - the **time until payoff**.
- Each is shown with its **comparison to the baseline** (the loan with no events, see 7.6), as defined in 7.5. _TBD_: how the payoff date is compared (e.g. as a difference in time).
- The values are the final, actual totals for the last period (see 7.5), not projections.
- As with the tooltip (5.8), values that are not calculated (e.g. while an event is out of order, see 5.5) are not shown. _Assumed_: the summary is hidden when none of its values are available.

## 6. Event Types

### 6.1 Recast

#### Description

A recast re-amortizes the loan's remaining balance over a new term, at the same interest rate, after a lump sum is paid toward the principal. The interest rate does not change. The user chooses the new term length; the periodic payment is recalculated from it.

#### Card Fields

| Field             | Description                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date              | Date the recast takes place (common to all events, see 5.5).                                                                                                    |
| Principal payment | Lump sum paid toward the principal at the time of the recast.                                                                                                   |
| Recast fee        | Cost charged by the lender to recast the loan. Always a flat amount.                                                                                            |
| New term          | Length of the loan after the recast, in months, with the equivalent in years and months displayed next to it (as in 4.1). Defaults to the original term length. |

All fields are editable.

#### Calculation Effects

At the event date:

1. The outstanding balance is the balance after the most recent payment on or before the event date. Interest accrued since that payment is **ignored**.
2. The **principal payment** is subtracted from the balance.
3. The **recast fee** is added to the total cost of the loan. It is a cost paid at the time of the event and is **not** added to the loan balance.
4. The periodic payment is **recalculated** from the new balance, the existing interest rate, and the **new term**, using the same amortization formula as the initial loan (see section 7). The new term is counted from the event date, so the payoff date becomes the event date plus the new term.
5. The new payment applies from the next payment after the event date onward, unless later events change it.

The principal payment and the recast fee both count toward the loan's total cost.

#### Default Values

- **New term**: the original term length from the loan definition.
- The principal payment and recast fee start empty.

#### Validation

- The **principal payment must not be greater than the remaining balance** at the event date.
- A recast dated after the loan is paid off is handled as an invalid event (see 5.7).

### 6.2 Lump Sum Payment

#### Description

A lump sum payment is a one-time payment made toward the loan's principal, with no other adjustments. The periodic payment amount, interest rate and term settings are unchanged, so the loan is paid off earlier.

#### Card Fields

| Field  | Description                                                |
| ------ | ---------------------------------------------------------- |
| Date   | Date the payment is made (common to all events, see 5.5).  |
| Amount | Amount of the lump sum, applied entirely to the principal. |

All fields are editable.

#### Calculation Effects

At the event date:

1. The outstanding balance is the balance after the most recent payment on or before the event date. Interest accrued since that payment is **ignored**.
2. The **amount** is subtracted from the balance.
3. The periodic payment is **not** recalculated (unlike a recast); payments continue at the same amount, so the remaining balance is paid off sooner.
4. The amount counts toward the loan's total cost.

#### Default Values

- None. The amount starts empty.

#### Validation

- The **amount must not be greater than the remaining balance** at the event date.
- A lump sum dated after the loan is paid off is handled as an invalid event (see 5.7).

### 6.3 Extra Regular Payment

#### Description

An extra regular payment adds a fixed extra amount, paid directly to the principal, to every payment on the loan from the event date onward. The extra amount is paid on the same schedule as the regular payments, using the loan's current payment frequency.

#### Card Fields

| Field  | Description                                                            |
| ------ | ---------------------------------------------------------------------- |
| Date   | Date the extra payments begin (common to all events, see 5.5).         |
| Amount | Extra amount added to each payment, applied entirely to the principal. |

All fields are editable.

#### Calculation Effects

From the event date onward:

1. Each regular payment is increased by the **amount**, and the extra is applied entirely to the principal. The regular payment amount itself is not recalculated.
2. The extra is paid with every payment and **always follows the loan's payment frequency**, including when a later change payment frequency event alters it.
3. The extra payments reduce the balance faster, so the loan is paid off earlier and less interest is paid.
4. The extra amounts count toward the loan's total cost.
5. The extra payments **stop when the loan is paid off**, or when a **later extra regular payment event with an amount of 0** takes effect. A later event with a non-zero amount replaces the earlier amount from its date onward (assumed).

#### Default Values

- None. The amount starts empty.

#### Validation

- The **amount must not be greater than the remaining balance** at the event date.
- In the final payment, the extra is limited to what remains of the balance.
- An extra regular payment dated after the loan is paid off is handled as an invalid event (see 5.7).

### 6.4 Refinance

#### Description

A refinance replaces the existing loan with a new loan on the remaining balance, with a new interest rate and term. It can also include closing costs and cash taken out of the property.

#### Card Fields

| Field                     | Description                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Date                      | Date the refinance takes place (common to all events, see 5.5).                                                    |
| New interest rate         | Fixed annual interest rate of the new loan.                                                                        |
| New term                  | Length of the new loan in months, with the equivalent in years and months displayed next to it (as in 4.1).        |
| Closing costs             | Flat amount charged to refinance (always a flat sum).                                                              |
| Roll costs into principal | Whether the closing costs are rolled into the new loan as principal (on) or paid out of pocket at the event (off). |
| Cash-out amount           | Additional cash borrowed against the property at the refinance. Optional.                                          |

All fields are editable.

#### Calculation Effects

At the event date:

1. The outstanding balance is the balance after the most recent payment on or before the event date. Interest accrued since that payment is **ignored**.
2. The **new loan principal** is the outstanding balance, plus the **cash-out amount**, plus the **closing costs** if they are financed.
3. The periodic payment is **recalculated** from the new principal, the **new interest rate** and the **new term**, using the same amortization formula as the initial loan (see section 7). The new term is counted from the event date, so the payoff date becomes the event date plus the new term.
4. The new payment applies from the next payment after the event date onward, unless later events change it. The payment frequency is unchanged; use a change payment frequency event to alter it.
5. If the closing costs are **not** financed, they are added to the total cost of the loan at the event date. If they are financed, they are paid through the new loan's payments and are not counted a second time.
6. Cash-out is not a cost in itself; it increases the principal, so the interest paid on it counts toward the total cost.

#### Default Values

- **New term**: the original term length from the loan definition.
- All other fields start empty (assumed, matching the other events).

#### Validation

- Standard validation applies: amounts must not be negative, and a refinance dated after the loan is paid off is handled as an invalid event (see 5.7).

### 6.5 Change Payment Frequency

#### Description

Changes how often payments are made, from the event date onward. The interest rate and the payoff date are unchanged by the event itself; the payment amount is recalculated for the new frequency.

#### Card Fields

| Field             | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| Date              | Date the change takes effect (common to all events, see 5.5).            |
| Payment frequency | The new frequency: monthly, bi-weekly, accelerated bi-weekly, or weekly. |

All fields are editable.

#### Calculation Effects

At the event date:

1. The outstanding balance is the balance after the most recent payment on or before the event date. Interest accrued since that payment is **ignored**.
2. Payments are made at the **new frequency** from the next payment after the event date onward.
3. The payment amount is **recalculated** for the new frequency from the outstanding balance, the existing interest rate and the remaining term, using the amortization formula with the periodic rate and number of payments for the new frequency (see section 7). The payoff date stays the same unless later events change it.
4. Any **extra regular payments** in effect follow the new frequency (see 6.3).

#### Default Values

- **Payment frequency**: the frequency in effect at the event date (assumed, so that a new card does not change anything until edited).

#### Validation

- Standard validation applies: a change payment frequency event dated after the loan is paid off is handled as an invalid event (see 5.7).

#### Accelerated Bi-Weekly

Accelerated bi-weekly is a payment frequency with **26 bi-weekly payments per year**, where **two of those 26 payments go directly to the principal**. It differs from plain bi-weekly, where all payments are handled the same way and nothing is accelerated.

- Each payment is **half of the monthly payment** for the loan. The monthly payment is the one the loan would have at a monthly frequency for the current balance, rate and remaining term.
- Of the 26 payments each year, **24 are regular payments** (covering interest and principal, equivalent to 12 monthly payments) and **2 are applied entirely to the principal**. The year's total is 13 monthly payments' worth, so the loan is paid off sooner and less interest is paid.
- The two principal-only payments are the same size as the other payments, and they count toward the loan's total cost.
- **Which payments are principal-only**: the **last two payments of the year** when the year is a full year (26 payments). In a partial year:
  - a **half year** (13 payments or more) has its **last payment** as principal-only;
  - **less than half a year** (fewer than 13 payments) has **none**.
    Partial years occur when accelerated bi-weekly begins or ends partway through a year, e.g. after a change payment frequency event or in the final year of the loan.
- The half-monthly amount is **recalculated after a recast or refinance** while this frequency is in effect, from the new monthly payment.

## 7. Calculations

### 7.1 Overview

The loan is calculated as a series of **periods**. A period is the stretch of time between two consecutive events (the first period begins at the loan start). Within a period the loan does not change, so its state can be described with standard closed-form formulas. Each event changes the loan's state and begins a new period.

For every period, the application:

1. Takes the **state of the loan after the event** that begins the period (the initial loan for the first period).
2. Calculates the period's **monthly payment, total interest cost, total cost and time to payoff** from that state, using the standard formulas in 7.3.
3. Walks the period's payments up to the next event (or to payoff, for the last period) and **records the actual costs accrued** during it (payments made, interest paid, principal paid, fees).
4. Hands the resulting balance and recorded costs to the next event, and repeats until the loan is paid off.

Calculations are not attempted while any event is out of order (see 5.5). Events dated after payoff are ignored (see 5.7).

### 7.2 Loan State

The state of the loan at the start of a period consists of:

- remaining balance,
- annual interest rate,
- remaining term (months) and the term the current payment was calculated for,
- payment frequency,
- regular payment amount,
- extra regular payment amount (0 if none),
- costs recorded so far (see 7.4).

Each event type produces the next state as described in section 6. In all cases the balance used at an event is the balance after the most recent payment on or before the event date; interest accrued since that payment is ignored.

### 7.3 Standard Formulas

Let:

- `L` be the balance at the start of the period,
- `r` be the periodic interest rate: the annual rate divided by the number of payments per year,
- `n` be the number of payments in the remaining term.

| Payments per year | Frequency                                           |
| ----------------- | --------------------------------------------------- |
| 12                | Monthly                                             |
| 26                | Bi-weekly                                           |
| 52                | Weekly                                              |
| 26                | Accelerated bi-weekly (payment is half the monthly) |

**Periodic payment**: `P = L · r / (1 − (1 + r)^(−n))`. The existing implementation is `amortizedLoanPaymentAmount` in `src/utilities/loanCalc.ts`.

**Time to payoff** (number of payments) with a payment of `P` plus any extra amount `E` per payment: `n = −ln(1 − L · r / (P + E)) / ln(1 + r)`, converted to a duration using the frequency. Without extras this equals the remaining term.

**Total interest cost** (projected, from the period start with no further events) = total of all projected payments − `L`.

**Total cost** (projected, from the period start with no further events) = total of all projected payments, plus fees.

Accelerated bi-weekly uses half the monthly payment for each payment and applies the principal-only payments described in 6.5. Because of those, it has no closed form and is walked payment by payment.

### 7.4 Recorded (Actual) Costs

- Within a period, each payment is walked in order: interest for the payment = balance × `r`; the remainder of the payment (plus any extra) reduces the balance.
- For the period, the application records the **actual payments made, interest paid, and principal paid** between the period's start and the next event. Fees from events (recast fee, refinance closing costs not rolled into principal) are recorded in the period of the event that incurs them.
- Recorded costs accumulate over all periods. They are not recalculated when a later event changes the loan; later events only affect later periods.

### 7.5 Results per Period

The values for a period are the ones shown in the timeline tooltip for its line segment (see 5.8), each with a comparison to the baseline (see 7.6):

| Value                  | Definition                                                                                                                                                                                                                                                   | Comparison to baseline                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Payment amount         | The **per-payment amount** from the formula in 7.3 for the state after the event. For non-monthly frequencies it is the amount of one payment at that frequency (not a monthly equivalent) and is **labeled with the frequency** (e.g. "Bi-weekly payment"). | Baseline payment amount.                              |
| Remaining balance      | The balance at the start of the period.                                                                                                                                                                                                                      | Baseline balance at the same point in time (assumed). |
| Time until payoff      | The time to payoff from the formula in 7.3 for the state after the event.                                                                                                                                                                                    | Difference from the baseline's time to payoff.        |
| Total cost of the loan | Recorded costs for all earlier periods, plus the projected total cost from this period's start.                                                                                                                                                              | Difference from the baseline's total cost.            |
| Total interest cost    | Recorded interest for all earlier periods, plus the projected interest from this period's start.                                                                                                                                                             | Difference from the baseline's total interest cost.   |

The _total cost_ for the last period is the final, actual total cost of the loan, since no further events change it.

### 7.6 Baseline

- In addition to the loan with its events, the application calculates a **baseline**: the same loan run to payoff **with no events**, using only the loan definition (section 4).
- The baseline uses the same method and formulas as any other loan (7.1 to 7.4), as a single period running from the loan start to payoff.
- The baseline is **always shown** alongside the loan with events, so the user can compare the two. It has the same values as in 7.5: monthly payment, remaining balance, time until payoff, total cost, and total interest cost.
- The baseline is not affected by events, including invalid events and events dated after payoff.
- The baseline comparison appears in the timeline tooltips (5.8; see 7.5). The baseline is also shown in the timeline summary (5.9).

### 7.7 Payment Schedule

- Payments happen on the **1st of the month**, or on the **1st and 15th of the month**.
- The **first payment** is the first 1st after the loan is originated (strictly after the start date; _assumed_).
- The **payoff date** is displayed as the date on which the **final payment** is made.
- _TBD_: which frequencies use the 1st and which use the 1st and 15th. Monthly naturally uses the 1st. Semi-monthly 1st-and-15th payments are 24 per year, which does not match the 26 payments per year for bi-weekly and accelerated bi-weekly, or the 52 for weekly, defined in 7.3 and 6.5. How these frequencies map onto the 1st and 15th needs to be decided.

### 7.8 Rounding and the Final Payment

- Calculations use full precision. Values are **rounded to 2 decimal places for display only**.
- The **final payment is adjusted to match the payoff amount**: it equals the remaining balance plus the interest due, so the loan ends with exactly a zero balance. For the accelerated bi-weekly frequency, the same applies to the final payment, whether it is a regular or a principal-only payment.

### 7.9 Open Questions

- _TBD_: how time until payoff and payoff date are both shown in the tooltip (the tooltip currently shows time until payoff; the payoff date is the date of the final payment).
- _TBD_: how a baseline comparison is displayed (e.g. as a difference with a sign, or the baseline value beside it).

## 8. User Interface

### 8.1 Share Button

- A **share button** is shown at the **top of the page, on the right**.
- The button has a **tooltip**. The tooltip text (e.g. "Copy shareable link").
- Activating the button gives the user the shareable link described in 2.2 (the timeline encoded in the URL). _Assumed_: it copies the link to the clipboard. After copying, a **toast notification** confirms that the shareable link was copied. The toast is announced to screen readers (see 2.4). The toast text is **"Copied scenario URL!"**. If copying is not available, a **failure notification** reading **"Failed to copy scenario URL"** is shown instead. The success toast is shown for **3 seconds** and the failure notification for **10 seconds**.
- The button is operable with a keyboard and screen reader compatible (see 2.4): it has an accessible name, and its tooltip is shown on keyboard focus as well as on hover. On touch devices, where there is no hover, the button's purpose must still be clear.

### 8.2 Layout

- The page is laid out **vertically**, with the **timeline centered** on the page.
- The **loan definition** (section 4) sits at the **top of the page, above the timeline**.
- **Navigation is by scrolling**; there is no other navigation.
- The timeline has a **maximum width of 1200px**; on wider screens it stays centered at that width (see `Mortgage Calculator App Mock.excalidraw.svg`).

### 8.3 Responsive Behavior

- The page is **responsive**. The elements within each event card are **rearranged to fit the viewport width** (e.g. fields stack vertically on narrow screens).
- This applies on mobile as well as desktop (see 2.3). The add-button options also switch to a vertical list near viewport edges (see 5.3).
- Breakpoints are the **standard MUI breakpoints**: xs (0), sm (600), md (900), lg (1200), xl (1536) pixels.

### 8.4 Theming

- The application is **dark mode only**: there is no light theme and no theme toggle.

### 8.5 Input Formatting

- **Date fields** are masked to the appropriate date format and validated as dates, wherever a date is entered (the loan start date and each event's date). The date format is **ISO** (`YYYY-MM-DD`). Other typed fields get masking and validation as described below.
- This validates that an entered date is a valid date. It does not conflict with 4.3, which applies no validation to the loan values, and ordering of event dates is handled separately (see 5.5).
- **Currency fields** are **dollar denominated** and limited to **2 decimal places**. There is **no thousands separator**.
- **Percent fields** are shown as percentage numbers (e.g. 5 for 5%, 6.5 for 6.5%) and **stored as decimals** (e.g. 0.05, 0.065), including in the shared link (see 2.2). Whole numbers are shown without a decimal part, and **fractional percentages are allowed**. This applies to the interest rates and the down payment percentage. _TBD_: the maximum number of decimal places. Note that `amortizedLoanPaymentAmount` in `src/utilities/loanCalc.ts` currently takes the rate as a percentage (6.5 for 6.5%) rather than a decimal.

## 9. Data Management

- No persistence (see 2.2).
- Sharing via URL-encoded timeline (see 2.2); the share button is described in 8.1.
