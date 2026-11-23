# LoLrec Model Specification

This document follows PRD.md. It describes the planned model; training and model integration have not been completed.

## 1. Dataset

We will use the 2024 LoL-Draft dataset, which contains professional League of Legends picks and bans.

- Source: https://github.com/DeusExMachina1993/LoL-Draft
- Version: https://github.com/DeusExMachina1993/LoL-Draft/tree/447d68cd5b5e770aba90979be9efe6b0c398a724/2024
- Files: `2024/all_patches/all_patches.inter` and `2024/games.csv`.
- Size: 11,089 games and 221,780 pick/ban records in the original 2024 file.
- Main fields: Champion ID, pick/ban action, team, draft slot, match and series IDs, patch, and match time.
- License: CC BY-SA 4.0. Include the dataset attribution and license when sharing data or modified extracts.

For example, an inspected record contains Varus (champion ID 110), a ban at slot 0. The `label` field distinguishes picks from bans; it is not the training target. `timestamp` is the draft slot, while `start_time` is the match time.

We will use matches with complete ordinary drafts and exclude formats that require information from previous games, such as Fearless Draft. The final training size will be recorded after filtering. Professional match data may not represent current solo-queue choices, and patches can change champion popularity. The dataset also does not provide player position labels for this initial model.

## 2. Model Architecture

The learning task is to predict the next champion picked by a team, given the draft information available before that pick. The observed champion is the training target. Match wins and losses are not used as targets.

We plan to train a small feed-forward neural network (DNN) in PyTorch:

```text
Draft features -> Linear(128) -> ReLU -> Linear(64) -> ReLU -> Champion scores
```

The input represents which champions have been picked or banned, together with side and draft progress. A DNN fits these fixed-length features and can run locally without a separate GPU inference server. This initial model does not require the full action sequence or player positions.

The model learns historical selection patterns. Its scores rank candidates; they do not measure win probability or prove that a champion is the best possible choice.

## 3. Training and Evaluation Plan

1. Group records by match and sort actions by draft slot.
2. For each pick, build the state before that action. Use the selecting team as our team and the other team as the opponent.
3. Use the chosen champion's vocabulary index as the target. Exclude that pick, later actions, and match outcomes from the input.
4. Split matches chronologically into approximately 70% training, 15% validation, and 15% test data. Keep each series together and exclude series crossing date boundaries. Record the resulting dates and sizes before training.
5. Train on the team's GPU using cross-entropy loss and Adam. Start with a learning rate of 0.001, batch size 128, and up to 50 epochs. Stop if validation loss does not improve for five epochs.
6. Select the checkpoint using validation loss and evaluate it on the held-out test set.

We will report Top-1 accuracy and mean reciprocal rank (MRR), which measures how highly the actual next pick is ranked. Compare the model with a baseline that ranks champions by training-set pick frequency, using the same test examples and candidate exclusions. Report test champions not observed in training rather than silently removing those examples.

Save the trained weights as `model.pt`, together with the champion ID mapping and preprocessing settings. No trained weight file is required for Task 1.

## 4. Input/Output Interface

Let `C` be the number of champions in the fixed model catalog and `N` the batch size. The current local catalog contains 169 champions. Riot champion IDs are mapped to indices from `0` to `C - 1`; raw IDs are not used as array indices.

| Item | Shape / Type | Meaning |
| --- | --- | --- |
| Our picks | `[N, C]`, float32 | 1 for each champion already picked by the recommendation target's team; otherwise 0 |
| Opponent picks | `[N, C]`, float32 | 1 for each champion already picked by the other team; otherwise 0 |
| Bans | `[N, C]`, float32 | 1 for each champion banned by either team; otherwise 0 |
| Context | `[N, 3]`, float32 | Blue-side indicator (1 blue, 0 red), confirmed pick count divided by 10, confirmed ban count divided by 10 |
| Combined model input | `[N, 3C + 3]`, float32 | Concatenation of the four feature groups; `[N, 510]` with the current catalog |
| Training target | `[N]`, int64 | Index of the actual next picked champion |
| Model output | `[N, C]`, float32 | One score per champion; `[N, 169]` with the current catalog |

Pick and ban counts represent draft progress. The client phase determines whether a recommendation can run. Unconfirmed selections are excluded from the features. Position is displayed by the website when available but is not a model input.

For live use, the bridge must provide numeric champion IDs, the user's team and blue/red side, confirmed picks and bans, and the current phase. It must also identify whether the user can still pick. The current bridge needs to be extended with the missing fields before model integration.

At inference, exclude picked or banned champions, champions never picked in training, and any other unavailable candidates identified by the client. Rank the remaining candidates by score and return their IDs and ranks to the website. The website displays champion names and recommendation ranks without win-rate percentages. If required information is missing or a selected champion is outside the model catalog, display an unsupported-state message instead of a recommendation.

## 5. Deployment Plan

Train the model offline, then load the saved weights and ID mapping in the local Python bridge. Use CPU inference in evaluation mode with gradient calculation disabled. The model is loaded once when the bridge starts.

```text
Live champion selection -> LCU bridge -> Feature preparation -> Model
                                |                               |
                          Current draft                  Ranked candidates
                                +---------- Website ------------+
```

The browser receives the current draft and recommendations from the bridge. Recalculate when confirmed picks or bans change, and clear results when the session ends or the connection fails.

The Next.js website is deployed on Vercel. The bridge and model run on the user's PC. Provide Python dependencies, model files, and startup instructions with the bridge, and configure its allowed origin for the deployed website.

Measure CPU inference time during integration and reduce the model size if necessary. Verify the deployed website's local connection and recommendation updates using an actual LoL client. Until the model is available, keep the PRD's "Model integration pending" message in the recommendation area.
