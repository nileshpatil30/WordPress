import type { Metro, State, ZipCode } from "@/lib/types";

/**
 * GENERATED FILE - do not edit by hand.
 *
 * Produced by scripts/expand-geography.ts from the BLS OEWS metro file and the
 * HUD ZIP-to-CBSA crosswalk, both US federal works in the public domain.
 *
 * Geography only. Every price still comes from the ingesters, and a metro in
 * here with no wage row of its own falls back exactly as it did before.
 *
 * Committed empty on purpose. A static import that fails loudly when the file
 * is missing beats an optional require that silently reverts coverage - the
 * same reasoning as bls-labor.ts, written up in ./index.ts.
 */
export const expandedStates: State[] = [];

export const expandedMetros: Metro[] = [];

export const expandedZipCodes: ZipCode[] = [];
