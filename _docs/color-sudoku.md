I would make this a **game design specification**, not an implementation plan. The goal is that someone (or an agent) who understands the rendering/state framework can build it without needing to infer the game rules.

I would deliberately leave out future mechanics (stains, larger boards, multiplayer, etc.) except as “future considerations,” because the first version needs a very crisp proof.

---

# Color Field — Vision 1.0 Design Document

## 1. Overview

**Color Field** is a color manipulation puzzle game based on spatial influence and equilibrium.

The player controls a set of perimeter color sources surrounding a small grid. These sources combine to create an emergent color field inside the board. The objective is to reproduce a target color pattern by arranging the available color sources correctly.

The game is intended to create the feeling of shaping an invisible energy field: the player is not directly painting the board, but configuring the forces that generate it.

The central gameplay loop:

1. Observe a target color pattern.
2. Manipulate surrounding color sources.
3. Observe how the field changes.
4. Develop an intuition for how colors propagate.
5. Reach the target configuration.

---

# 2. Initial Game Board

## 2.1 Board Layout

The first version uses a 2×2 active board.

The full play area is a 4×4 arrangement:

```
┌─────┬─────┬─────┬─────┐
│     │ N1  │ N2  │     │
├─────┼─────┼─────┼─────┤
│ W1  │ A   │ B   │ E1  │
├─────┼─────┼─────┼─────┤
│ W2  │ C   │ D   │ E2  │
├─────┼─────┼─────┼─────┤
│     │ S1  │ S2  │     │
└─────┴─────┴─────┴─────┘
```

Only twelve positions are active.

The four corners are empty and unused.

The active positions are:

### Color sources

- N1
- N2
- E1
- E2
- S1
- S2
- W1
- W2

### Calculated cells

- A
- B
- C
- D

---

# 3. Objective

The player is shown a target 2×2 color pattern.

Example:

```
┌────────┬────────┐
│ Color1 │ Color2 │
├────────┼────────┤
│ Color3 │ Color4 │
└────────┴────────┘
```

The player's goal is to configure the surrounding color sources so that the calculated interior cells exactly reproduce the target.

The player does not directly edit interior colors.

---

# 4. Color Source Rules

## 4.1 Starting Inventory

The player begins with eight fixed color tokens.

Rules:

- Each token is unique.
- Each token must be placed.
- Each token occupies exactly one perimeter position.
- No empty perimeter positions exist in Vision 1.0.

Example:

```
Available tokens:

Ruby
Amber
Citrine
Emerald
Turquoise
Sapphire
Amethyst
Magenta
```

The exact palette is determined separately.

---

## 4.2 Player Interaction

The player may:

- Drag tokens between positions.
- Swap two token positions.
- Move tokens repeatedly before submitting.

The player may not:

- Change token colors.
- Modify interior cells.
- Create new colors.

---

# 5. Color Physics

## 5.1 Color Space

All color calculations occur in OKLab.

Reason:

- It is perceptually balanced.
- Averaging behaves naturally.
- Opposing colors can neutralize correctly.
- It avoids the problems of RGB averaging.

Alpha is not used.

Every color is fully opaque.

---

## 5.2 Influence Model

Each interior cell is influenced equally by its orthogonal neighbors.

Example:

```
A receives influence from:

N1
W1
B
C
```

B receives:

```
N2
E1
A
D
```

C receives:

```
W2
S1
A
D
```

D receives:

```
E2
S2
B
C
```

Each active neighbor contributes equally.

---

## 5.3 Equilibrium Calculation

The interior board does not update sequentially.

The four cells are solved simultaneously.

The final board state is the stable equilibrium where all cells satisfy their influence relationships.

Conceptually:

```
A = average(N1, W1, B, C)

B = average(N2, E1, A, D)

C = average(W2, S1, A, D)

D = average(E2, S2, B, C)
```

The solver must always produce the same result for the same token arrangement.

The animation of the field changing must not affect the underlying calculation.

---

# 6. Target Generation

## 6.1 Puzzle Creation

Puzzles are generated from valid solutions.

Process:

1. Select an arrangement of the eight color tokens.
2. Calculate the resulting interior field.
3. Use that field as the target.
4. Hide the original arrangement.
5. Present the player with the target only.

The target is never randomly invented.

Every target is guaranteed to be achievable.

---

## 6.2 Solution Uniqueness

Every puzzle must have exactly one valid solution.

During generation:

1. Enumerate all possible token arrangements.
2. Calculate the resulting interior field for each.
3. Compare against the target.
4. Reject any target with multiple valid solutions.

Visual similarity should also be considered.

A technically different solution that appears identical should count as a duplicate.

---

# 7. Matching Rules

The player's result is compared against the target using OKLab distance.

A solved board requires:

- All four interior cells match.
- No individual cell exceeds the allowed color error threshold.

A small tolerance exists only to account for floating-point precision.

---

# 8. Visual Design

## 8.1 Target Display

The target is intentionally simple.

It displays:

- Four flat color blocks.
- No gradients.
- No texture.
- No animation.

The target represents the desired final values.

---

## 8.2 Player Board Display

The player's board displays a continuous color field.

The four calculated cells are not shown as four isolated rectangles.

Instead:

- Colors blend naturally across the entire board.
- Each calculated cell has a canonical center color.
- The surrounding field interpolates between these values.

The visual result should feel like:

- A magical field.
- A gemstone.
- A potion.
- A living color surface.

The player should learn to interpret the shape and movement of the field.

---

## 8.3 Field Rendering Rules

The rendered field must preserve:

- Exact calculated colors at the four cell centers.
- Smooth transitions between regions.
- Deterministic output.

Visual effects must not alter gameplay values.

---

# 9. Feedback

## 9.1 During Play

When a token moves:

1. The new equilibrium is calculated.
2. The field animates from the previous state to the new state.
3. The player sees the result of the change.

The animation is only visual.

---

## 9.2 Near Completion

As the player approaches the solution:

- The field should appear increasingly coherent.
- Matching regions should feel more stable.
- Small visual feedback may indicate improvement.

Avoid showing exact numerical error values during normal play.

The player should develop visual intuition.

---

## 9.3 Completion

When solved:

- The field transitions into a completed state.
- The four target regions align.
- A subtle visual effect confirms success.

The success effect should not obscure the final colors.

---

# 10. Difficulty Scaling

Vision 1.0 uses only:

- 2×2 board.
- Eight fixed tokens.
- Full token placement.

Difficulty comes from:

- More visually similar palettes.
- More complex color interactions.
- Less obvious source relationships.
- More challenging target patterns.

Future difficulty systems may include:

- Larger boards.
- Empty source positions.
- Internal color stains.
- Weighted influence.
- Special cells.

These are not part of Vision 1.0.

---

# 11. Design Principles

## Predictability

Every action has a deterministic consequence.

The player should learn the rules through observation.

---

## Emergence

The player does not paint colors directly.

The player creates conditions from which colors emerge.

---

## Constraint

The player should solve through reasoning, not arbitrary adjustment.

The limited token inventory is the primary puzzle constraint.

---

## Beauty

The color field itself is part of the reward.

The player should enjoy watching the system settle.

---

# 12. Vision 1.0 Success Criteria

The first version is successful if:

1. Players understand that perimeter tokens influence the interior.
2. Players can predict approximately how moves will affect the field.
3. Solving feels like discovery rather than trial-and-error.
4. The color field is visually compelling.
5. Generated puzzles are unique and solvable.
6. The equilibrium behavior remains understandable.

---

# Future Concepts (Not Vision 1.0)

Potential future expansions:

- Larger boards.
- Cascading long-distance influence.
- Internal color stains.
- Persistent puzzle worlds.
- Multiplayer cooperative solving.
- Competitive speed solving.
- Generated daily puzzles.
- Advanced visual materials.

These should only be introduced after the basic field manipulation mechanic proves engaging.

---

This is the level of document I would want before handing it to an implementation agent: enough rules that there is no ambiguity, but not prescribing the internal architecture. The important thing is that the first build proves the *feeling* of manipulating a color field, not the eventual feature set.