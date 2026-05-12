<h1 align="center">Pokémon Atlas</h1>

<p align="center">
  <img src="screenshot.png" alt="Pokémon Atlas Screenshot" width="800">
</p>

[中文文档](README.zh-CN.md)

### Welcome to the Pokémon Universe
**Pokémon Graph** is an interactive, visual encyclopedia that lets you explore the vast and interconnected world of Pokémon. Instead of browsing traditional lists or wikis, you can dive into a massive, interconnected constellation of Pokémon, Types, and Abilities.

### What You Can Do
- **Explore Relationships**: See how different Pokémon are connected through evolution paths, shared types, and common abilities (including hidden abilities).
- **Search & Discover**: Quickly find your favorite Pokémon, Type, or Ability using the built-in search.
- **Focus Mode**: Click on any node to isolate it and immediately highlight its direct connections.
- **Rich Details**: View detailed information directly in the side panel, including Pokédex numbers, generation info, ability effects, and precise evolution triggers (e.g., "Level up", "Use item").
- **Custom Filters**:
  - Toggle specific connection types on or off (Type, Evolution, Ability) to declutter the graph.
  - Filter the entire universe to only show Pokémon from your favorite Generation.

### Getting Started

#### 1. Install Dependencies
```bash
pnpm install
```

#### 2. Prepare Data
Run the following command to build the Pokémon dataset:
```bash
pnpm data:csv
```

#### 3. Run the App
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to start exploring!
