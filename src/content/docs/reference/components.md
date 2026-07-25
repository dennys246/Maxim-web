---
title: Components
description: An exhaustive snapshot of every pre-built SEM entity bundled with the Maxim component library, listed by category with its sensors, affordances, and failure modes.
---

This page is the exhaustive list. It enumerates every pre-built [SEM entity](/embodiment/sem-protocol/) that ships in the Maxim component library — its genre tags, key sensors, key affordances, and failure modes — read directly from the registry files rather than paraphrased. It is a companion to the [component library](/embodiment/component-library/) page, which explains how the registry, genre gating, and the ComponentIndex discovery layer actually work; that page is the "how", this page is the "what". Maxim is a bio-inspired cognitive architecture (`pip install pymaxim`, `import maxim`), and these components are the reusable furniture its cognition acts on.

Everything below was extracted from the canonical registry at [`src/maxim/_data/components/`](https://github.com/dennys246/Maxim/tree/main/src/maxim/_data/components) in the Maxim repo. That directory is the live source of truth; this catalog is a snapshot at time of writing and will drift as components are added and retuned.

## The true count

The registry ships **81 component YAML files** across seven categories. That is more than the curated totals you will see quoted elsewhere: the repository user doc says **72** and the interactive web catalog says **73**. The reconciliation is straightforward and worth stating plainly:

- The **72 vs 73** delta is a single Bodies row — the same one-component discrepancy noted on the [component library](/embodiment/component-library/) page. Both are hand-maintained curated counts.
- The curated numbers count a **stable subset** and omit files that ship purely as **experiment fixtures**. The registry tree additionally carries four `warmth_*` items (tagged `exp42`) and four `infant_humanoid*` body variants (`chilled`, `cold`, `naming_v1`, `operant`) used by specific developmental experiments, plus a full complement of `cradle_*` scene objects. Counting the actual files gives **81**.
- A separate [`archetypes/`](https://github.com/dennys246/Maxim/tree/main/src/maxim/_data/components/archetypes) directory holds seven base body-part templates (`humanoid`, `quadruped`, `avian`, `serpentine`, `machine`, `vehicle`, `environmental`). These are scaffolds other components inherit from, not standalone entities, so they are excluded from the count.

Per-category file counts: Weapons **9**, Creatures **8**, NPCs **13**, Environments **12**, Items **26**, Vehicles **3**, Bodies **10**. The categories the curated sources agree on match the files exactly; the surplus is entirely in Items and Bodies, where the experiment fixtures live. **Every row below comes from a real registry file** — no rows are website-only.

## Weapons (9)

| Component | Genre(s) | Senses | Affordances | Fails by |
| --- | --- | --- | --- | --- |
| `weapons/combat_knife` | modern | sharpness, durability | slash, stab, throw, cut_rope, pry | dulled, broken |
| `weapons/enchanted_bow` | fantasy | arrows, draw_strength, enchantment, string_tension | shoot, aimed_shot, enchanted_shot, volley, restring… | out_of_arrows, string_snapped, enchantment_faded |
| `weapons/longbow` | neutral | durability, tension, arrows | shoot, nock, restring | snapped_string, out_of_arrows |
| `weapons/magic_staff` | fantasy | mana, durability, attunement, corruption | cast_fireball, cast_shield, cast_heal, channel_power, strike… | mana_exhaustion, corruption_overload, shattered |
| `weapons/neural_disruptor` | cyberpunk | durability, charge_cells, heat, accuracy | fire, rapid_fire, pistol_whip, reload, cool_down | overheated, empty, structural_failure |
| `weapons/plasma_rifle` | scifi | plasma_charge, heat, barrel_integrity, accuracy | fire, overcharge_shot, burst_fire, vent_heat, swap_cell | overheated, cell_depleted, barrel_melt |
| `weapons/poison_dagger` | fantasy | sharpness, poison_doses, concealment | stab, poisoned_strike, throw, conceal, apply_poison | dulled, poison_depleted |
| `weapons/rusty_sword` | neutral | durability, sharpness, weight | slash, parry, throw, sharpen, repair | shatter, dulled |
| `weapons/shock_baton` | cyberpunk | durability, charge, weight | shock_strike, blunt_strike, parry, recharge, repair | charge_depleted, structural_failure |

## Creatures (8)

| Component | Genre(s) | Senses | Affordances | Fails by |
| --- | --- | --- | --- | --- |
| `creatures/alien_xenomorph` | scifi, horror | hp, aggression, acid_blood, stealth, hunger | tail_strike, inner_jaw, acid_spit, pounce, climb_surface… | wounded, death |
| `creatures/cyberdog` | cyberpunk | hp, aggression, armor_integrity, thermal_vision… | bite, lunge, shock_bite, growl, circle, flee | destroyed, armor_breach, cowed |
| `creatures/dragon` | fantasy | fire_breath_charge, aggression | fire_breath, bite, claw_strike, tail_sweep, dive_attack, take_flight… | grounded, jaw_broken, death |
| `creatures/giant_spider` | fantasy, horror | hp, venom_sacs, web_silk, aggression | bite, web_trap, ambush, climb, retreat_to_web | venom_depleted, silk_exhausted, death |
| `creatures/patrol_drone` | cyberpunk | hp, battery, signal_strength, aggression | tase, spotlight, ram, patrol, pursue, retreat | power_loss, signal_lost, destroyed |
| `creatures/revenant` | horror | hp, rage, regeneration, fear_aura | claw, wail, grapple, drain_life, phase_through, stalk | banished, weakened |
| `creatures/skeleton_warrior` | fantasy | hp, aggression, bone_integrity, necromantic_binding | sword_slash, shield_bash, throw_bone, shamble, reassemble | shattered, binding_broken, destroyed |
| `creatures/wolf` | neutral | hp, aggression, hunger | bite, lunge, growl, circle, flee | death, cowed |

## NPCs (13)

| Component | Genre(s) | Senses | Affordances | Fails by |
| --- | --- | --- | --- | --- |
| `npcs/base_humanoid` | neutral | hp, stamina, mood | speak, punch, shove | exhaustion, death |
| `npcs/blacksmith` | fantasy, historical | hp, stamina, trust, crafting_skill | speak, haggle, repair_weapon, forge_item, appraise | exhausted, distrust |
| `npcs/corpo_guard` | cyberpunk | hp, armor_integrity, comms_status, suspicion | speak, interrogate, attack, block, call_backup | armor_breach, comms_down |
| `npcs/detective` | modern | hp, suspicion, trust, alertness | speak, interrogate, present_evidence, observe, take_notes | hostile_witness, suspicious |
| `npcs/ferryman` | neutral | trust, health | speak, offer_payment, threaten | hostility, refusal |
| `npcs/guard` | neutral | hp, trust, suspicion | speak, interrogate, attack, block | hostility |
| `npcs/merchant` | neutral | hp, trust, gold | speak, trade, haggle | — |
| `npcs/netrunner` | cyberpunk | hp, trust, suspicion, net_access | speak, negotiate, threaten, hack, share_intel | betrayal, disconnected |
| `npcs/roman_legionary` | historical | hp, morale, discipline, fatigue, trust | gladius_thrust, shield_bash, throw_pilum, speak, give_orders | routed, exhausted |
| `npcs/street_fixer` | neutral, cyberpunk | hp, trust, greed, reputation, debt_owed | speak, negotiate, intimidate, call_in_favor, buy_intel… | betrayal, desperate |
| `npcs/sysadmin` | devops, modern | hp, stress, trust, caffeine, expertise | speak, ask_for_help, escalate, pair_debug, grant_access | burnout, caffeine_crash |
| `npcs/thief` | fantasy | hp, trust, stealth, greed | speak, bribe, intimidate, pickpocket, lockpick, scout_area | caught, hostile |
| `npcs/wizard` | fantasy | hp, mana, trust, arcane_focus | speak, request_knowledge, trade, cast_spell, ward | mana_depleted, hostile |

## Environments (12)

| Component | Genre(s) | Senses | Affordances | Fails by |
| --- | --- | --- | --- | --- |
| `environments/abandoned_warehouse` | modern | lighting, structural_integrity, noise_level, occupant_count… | look_around, search_area, listen, use_flashlight, sneak, climb_rafters | structural_collapse, total_darkness |
| `environments/dungeon_corridor` | fantasy | lighting, air_quality, trap_density, structural_integrity | search_for_traps, light_torch, listen, check_walls, proceed_carefully… | cave_in, total_darkness |
| `environments/enchanted_grove` | fantasy | ambient_magic, lighting, hostility, visibility | look_around, gather_herbs, meditate, drink_from_spring | grove_corrupted |
| `environments/forest_clearing` | neutral | visibility, ambient_noise, cover_available | survey, hide, forage | — |
| `environments/haunted_manor` | horror | lighting, supernatural_presence, temperature, sanity_drain… | look_around, search_room, read_diary, barricade_door, run, hide… | entity_manifests, exits_sealed, freezing |
| `environments/megacorp_lobby` | cyberpunk | security_level, crowd_density, noise_level, lighting, camera_coverage | look_around, blend_in, sprint_for_exit, use_crowd | — |
| `environments/neon_alley` | cyberpunk | noise_level, crowd_density, lighting, pollution, signal_interference… | look_around, listen, blend_in, duck_into_cover | — |
| `environments/ripperdoc_clinic` | cyberpunk | lighting, noise_level, sterility, security_level | look_around, browse_inventory, sit_in_chair | — |
| `environments/roman_forum` | historical | crowd_density, political_tension, time_of_day, noise_level | observe_crowd, listen_to_orator, speak_publicly, approach_senator, bribe… | riot |
| `environments/server_room` | cyberpunk | temperature, electrical_risk, noise_level, security_alert, lighting | access_terminal, splice_cable, disable_alarm, look_around | — |
| `environments/space_station_bridge` | scifi | oxygen, hull_integrity, power_level, gravity, alert_status | access_navigation, comms_hail, activate_shields, emergency_lockdown… | hull_breach, oxygen_critical, power_failure |
| `environments/tavern_interior` | neutral | noise_level, crowd_size, lighting | look_around, listen, order_drink | — |

## Items (26)

Canonical items first, then the developmental-arc scene objects. The three `*_vial` colored vials are unlabeled consumables (unknown contents on inspection); the `cradle_*` objects belong to the `cradle` developmental arc, and the four `warmth_*` objects are `exp42` experiment fixtures (capability-only, no sensors).

| Component | Genre(s) | Senses | Affordances | Fails by |
| --- | --- | --- | --- | --- |
| `items/antidote_vial` | fantasy | doses, potency | drink, examine | empty |
| `items/cursed_amulet` | horror, fantasy | curse_intensity, power, bearer_sanity, bond_strength | invoke_power, resist_whispers, examine, attempt_removal, purify | curse_overwhelm, sanity_break, bonded |
| `items/food_ration` | fantasy | portions, nutrition | eat, examine | empty |
| `items/healing_potion` | fantasy | doses, potency, freshness | drink, administer, examine | empty, expired |
| `items/laptop` | modern | battery, storage_used, cpu_temp, network_signal | write_file, read_file, run_program, browse_web, send_email… | battery_dead, overheating, storage_full |
| `items/lockpick_set` | modern, fantasy | picks_remaining, tension_wrench, quality | pick_lock, rake_lock, examine_lock | picks_broken, wrench_bent |
| `items/poison_vial` | fantasy | doses, toxicity | drink, examine | poisoned |
| `items/radio_transceiver` | modern, historical | battery, signal_strength, frequency, encryption | transmit, listen, scan_frequencies, change_frequency, extend_antenna… | battery_dead, no_signal |
| `items/spellbook` | fantasy | pages_intact, comprehension, ward_strength | read, transcribe, decipher, cast_from_book, close_and_ward | pages_crumble, ward_backlash |
| `items/terminal_console` | devops, modern | uptime, cpu_load, disk_usage, active_connections, security_posture | run_command, check_logs, deploy_service, audit_access, rotate_credentials… | disk_full, overloaded, breach_detected |
| `items/water_flask` | fantasy | fill_level, purity | drink, refill | empty |
| `items/orange_triangular_crystal_vial` | fantasy | doses, potency, viscosity | drink, examine | empty, toxic |
| `items/purple_hexagonal_glass_vial` | fantasy | doses, potency, viscosity | drink, examine | empty |
| `items/teal_cylindrical_ceramic_vial` | fantasy | doses, potency, viscosity | drink, examine | empty |
| `items/cradle_blanket` | neutral (cradle) | texture, thermal | wrap, touch, examine | — |
| `items/cradle_button` | neutral (cradle) | pressed | press | — |
| `items/cradle_cool_air` | neutral (cradle) | temperature, intensity | feel, shelter | — |
| `items/cradle_false_hearth` | neutral (cradle) | heat_output, fuel | observe, warm_self, touch | — |
| `items/cradle_fire_pit` | neutral (cradle) | heat_output, fuel | observe, warm_self, touch | — |
| `items/cradle_food` | neutral (cradle) | portions, freshness | eat | — |
| `items/cradle_lever_door` | neutral (cradle) | lever_position, door_state | pull, push | — |
| `items/cradle_sharp_rock` | neutral (cradle) | sharpness | examine, touch | laceration |
| `items/warmth_alpha_safe` | neutral (exp42) | — | observe, warm_self, touch | — |
| `items/warmth_alpha_harm` | neutral (exp42) | — | observe, warm_self, touch | — |
| `items/warmth_beta_safe` | neutral (exp42) | — | observe, warm_self, touch | — |
| `items/warmth_beta_harm` | neutral (exp42) | — | observe, warm_self, touch | — |

## Vehicles (3)

| Component | Genre(s) | Senses | Affordances | Fails by |
| --- | --- | --- | --- | --- |
| `vehicles/horse` | fantasy, historical | stamina, hp, loyalty, speed, hunger | mount, dismount, gallop, trot, halt, feed… | exhausted, spooked, collapsed |
| `vehicles/pickup_truck` | modern | fuel, engine_health, speed, tire_condition, cargo_weight | start_engine, drive, accelerate, brake, load_cargo… | out_of_fuel, engine_failure, flat_tire |
| `vehicles/sailing_ship` | historical | hull_integrity, sail_condition, crew_morale, supplies, wind_strength… | set_course, raise_sails, drop_anchor, ration_supplies, repair_hull… | hull_breach, becalmed, mutiny, starvation |

## Bodies (10)

Bodies are the entities a Maxim mind is embodied in. Six are the stable set the curated catalog counts; the four `infant_humanoid*` variants below them are developmental-experiment fixtures (`chilled`/`cold`/`naming_v1` are `exp42`/`cradle` runs, `operant` is the operant-orient arc). This is where the 72-vs-73 curated disagreement lives.

| Component | Genre(s) | Senses | Affordances | Fails by |
| --- | --- | --- | --- | --- |
| `bodies/base_humanoid` | neutral | stamina, hunger, visibility, carrying_weight, azimuth | look, listen, turn_left, turn_right, move, pick_up, use, speak… | concussion, exhaustion, crippled, injury, overburdened |
| `bodies/reachy_mini` | robot (hardware) | head_yaw/pitch/roll, body_yaw, antenna_left/right, camera_health, battery, motor_temperature… | look_at, goto_pose, nod, shake_head, antenna_alert, get_frame, wake_up… | thermal_throttling, low_battery, pose_drift, camera_lost, microphone_lost |
| `bodies/cybernetic_arm` | cyberpunk | integrity, grip_strength, power, proprioception, pain_feedback | grip, punch, crush, fine_manipulate, recalibrate, emergency_detach | servo_failure, power_loss, grip_malfunction |
| `bodies/megarm_v3` | cyberpunk | integrity, grip_strength, power, proprioception, pain_feedback, micro_tools | grip, punch, crush, deploy_blade, interface_jack, recalibrate… | servo_failure, power_loss, proprioceptive_drift |
| `bodies/host_machine` | modern, devops | cpu_usage, memory_usage, disk_usage, gpu_usage, network_latency | (monitoring only) | overheating, disk_full, high_latency |
| `bodies/infant_humanoid` | neutral (cradle) | hunger, thirst, core_temperature | (developmental) | — |
| `bodies/infant_operant` | neutral (cradle) | azimuth | (developmental) | — |
| `bodies/infant_humanoid_cold` | neutral (cradle) | core_temperature | (developmental) | — |
| `bodies/infant_humanoid_chilled` | neutral (exp42) | cold, hunger, thirst | (developmental) | — |
| `bodies/infant_humanoid_naming_v1` | neutral (cradle) | — | (developmental) | — |

## Keeping this current

This catalog tracks the repository registry and can drift. When the tables here and the files disagree, the files win. The canonical live source is [`src/maxim/_data/components/`](https://github.com/dennys246/Maxim/tree/main/src/maxim/_data/components) on GitHub; to regenerate the authoritative listing at any moment, enumerate the registry rather than trusting a hand-copied total (`maxim.create.templates()` returns the live grouping by category).

Related reading:

- [Component library](/embodiment/component-library/) — how discovery, genre gating, and the ComponentIndex work; how to reference and extend components.
- [SEM protocol](/embodiment/sem-protocol/) — the sensor/entity/modulator format every component in these tables implements.
- [Asset Foundry](/embodiment/asset-foundry/) — how new components get generated when the shelf does not stock what a campaign needs.
- [Simulation](/guides/simulation/) — where these components are cast into campaigns as NPCs, world objects, and encounter props.
