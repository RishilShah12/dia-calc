import { createDb } from "@dia-calc/db";
import { rapPriceList } from "@dia-calc/db/schema/pricing";
import { ORPCError, type RouterClient } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import { fetchAllGrids } from "../rapnet";

/** Rapaport republishes every Thursday 23:59 ET, so a day-old copy is worth rechecking. */
const STALE_MS = 24 * 60 * 60 * 1000;

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	priceList: {
		// Protected: the Rapaport list is copyrighted and subscriber-only, so it
		// must never be served to an anonymous request.
		get: protectedProcedure
			.input(z.object({ force: z.boolean().default(false) }))
			.handler(async ({ input }) => {
				const db = createDb();
				const stored = await db.select().from(rapPriceList);
				const isStale =
					stored.length === 0 ||
					stored.some((row) => Date.now() - row.fetchedAt.getTime() > STALE_MS);

				if (!(input.force || isStale)) {
					return stored.map((row) => row.grid);
				}

				try {
					const grids = await fetchAllGrids();
					const fetchedAt = new Date();
					await Promise.all(
						grids.map((grid) =>
							db
								.insert(rapPriceList)
								.values({
									fetchedAt,
									grid,
									listDate: grid.date,
									shape: grid.shape,
								})
								.onConflictDoUpdate({
									set: { fetchedAt, grid, listDate: grid.date },
									target: rapPriceList.shape,
								})
						)
					);
					return grids;
				} catch (error) {
					// A Rapaport outage must not take the calculator down: a stale list
					// beats no list. Only fail outright when there is nothing cached.
					if (stored.length === 0) {
						throw new ORPCError("SERVICE_UNAVAILABLE", {
							cause: error,
							message: "Rapaport price list unavailable and nothing cached",
						});
					}
					return stored.map((row) => row.grid);
				}
			}),
	},
	privateData: protectedProcedure.handler(({ context }) => ({
		message: "This is private",
		user: context.session?.user,
	})),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
