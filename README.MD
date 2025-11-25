# 🎮 Item Ownership Analysis and Filtering Project

## 🎯 Project Goal

The primary objective is to **retrieve a filtered list of owned items** from a selection of 'enrolled' users, allowing for further refinement based on specific **Categories** and **Genres**.

---

## 🔗 Project Context and Data Source

The initial list of enrolled users, item data, and overall project tracking are managed in the following Google Sheet:

[Project Tracking Spreadsheet](https://docs.google.com/spreadsheets/d/1PtWcloteob212EVEY_8CFx_gd04holskCP2B2ZzvSgE/edit?gid=1517685710#gid=1517685710)

• website will be a hyperlink in the game name cell
• profileUrl will be used as a hyperlink in the persons name cell

---

## ⚙️ API Workflow and Logic

The process utilizes two main API calls (`ownedItems` and `itemDetails`) to first gather user libraries and then enrich the data for common items.

### API Process

| API Endpoint              | Purpose                                          | Scope per Request              | Required Logic                                                                                                  |
| :------------------------ | :----------------------------------------------- | :----------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **`ownedItems`**  | Pulls the entire user's item library.            | One user per API request.      | Must be executed for**each enrolled user**. The full list will be compared to find common `appId`s.     |
| **`itemDetails`** | Retrieves detailed metadata for a specific item. | One `appId` per API request. | Only search for `appIds` where the item is **owned by all enrolled users** (the filtered, common list). |

### Core Comparison Logic

1. Pull the full library using `ownedItems` for every user designated as "enrolled."
2. **Compare all user's owned items** and filter down the result to only the `appId`s that are common across *every* enrolled user's library (the intersection).

---

## 🔎 Mandatory Filtering Rule

Explicitly include the following criteria:

* **Categories**: `Co-op, Multiplayer`


---

## 📦 API Data Structures

The following fields are utilized from the respective data sources/API endpoints:

### 1. `userData` (Enrolled Users)

| Field Name      | Description                        | Notes   |
| :-------------- | :--------------------------------- | :------ |
| `userId`      | The user's unique identifier.      | `UID` |
| `personaName` | The user's nickname or alias.      |         |
| `realName`    | The user's actual name.            |         |
| `profileUrl`  | URL to the user's profile.         |         |
| `avatarUrl`   | URL to the user's profile picture. |         |

### 2. `ownedItems` (User Library)

| Field Name   | Description                     |
| :----------- | :------------------------------ |
| `appId`    | Unique identifier for the item. |
| `itemName` | Name of the item.               |

### 3. `itemDetails` (Detailed Metadata)

| Field Name               | Description                         | Example Data                                                     |
| :----------------------- | :---------------------------------- | :--------------------------------------------------------------- |
| `appId`                | Unique identifier for the item.     |                                                                  |
| `itemName`             | Name of the item.                   |                                                                  |
| `shortDescription`     | A brief summary.                    |                                                                  |
| `website`              | URL to the item's official website. |                                                                  |
| **`categories`** | Item features/play modes.           | `Multi-player`, `PvP`, `Online PvP`, `**Single-Player**` |
| **`genres`**     | Item style/type.                    | `Action`, `Adventure`, `Massively Multiplayer`             |
| `image`                | URL to the item's picture.          |                                                                  |
