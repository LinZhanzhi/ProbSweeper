// @ts-nocheck


class PrimeSieve {


	constructor(n) {

		if (n < 2) {
			this.max = 2;
		} else {
			this.max = n;
		}

		this.composite = Array(this.max).fill(false);

		const rootN = Math.floor(Math.sqrt(n));

		for (let i = 2; i < rootN; i++) {

			// if this is a prime number (not composite) then sieve the array
			if (!this.composite[i]) {
				let index = i + i;
				while (index <= this.max) {
					this.composite[index] = true;
					index = index + i;
				}
			}
		}

	}

	isPrime(n) {
		if (n <= 1 || n > this.max) {
			throw new Error("Prime check is outside of range: " + n);
		}

		return !this.composite[n];
	}

}


class BinomialCache {

	constructor(cacheSize, cacheFreshold, binomialEngine) {
		this.cacheSize = cacheSize;
		this.cacheFreshold = cacheFreshold;
		this.binomialEngine = binomialEngine;
		this.start = -1;
		this.useCount = 0;
		this.cacheRemoval = cacheSize / 2;
		this.cache = [];

		this.cacheHits = 0;
		this.cacheStores = 0;
		this.nearMiss = 0;
		this.fullCalc = 0;

		Object.seal(this); // prevent new values being created
	}

	getBinomial(k, n) {

		// if below the caching freshhold just go and get the binomial coefficient
		if (n <= this.cacheFreshold) {
			return this.binomialEngine.generate(k, n);
		}

		this.useCount++;

		let nearMissK = null;
		if (this.start != -1) {
			for (let i = this.start; i >= 0; i--) {
				const entry = this.cache[i];
				if (entry.k == k && entry.n == n) {
					this.cacheHits++;
					entry.lastUsed = this.useCount;
					return entry.bco;
				}
				if (entry.n == n && entry.k == k + 1) {
					nearMissK = entry;
				}
			}
		}

		let b;
		if (nearMissK != null) {
			b = nearMissK.bco * BigInt(nearMissK.k) / BigInt(nearMissK.n - nearMissK.k + 1);
			this.nearMiss++;
		} else {
			b = this.binomialEngine.generate(k, n);
			this.fullCalc++;
		}

		if (this.start == this.cacheSize - 1) {
			this.compressCache();
		}

		this.start++;
		const be = new BinomialEntry(k, n, b);
		be.lastUsed = this.useCount;

		this.cache.push(be);
		this.cacheStores++;

		return b;

	}

	compressCache() {

		console.log("Compressing the binomial cache");

		// sort into last used order
		this.cache.sort(function (a, b) { return a.lastUsed - b.lastUsed});

		if (this.cache[0].lastUsed > this.cache[1].lastUsed) {
			console.log("Sort order wrong!");

		}
		for (let i = 0; i < this.cacheSize - this.cacheRemoval; i++) {
			this.cache[i] = this.cache[i + this.cacheRemoval];
		}

		this.start = this.start - this.cacheRemoval;
		this.cache.length = this.start + 1;
	}

	// the largest Binomial co-efficient computable in Choose k from N
	getMaxN() {
		return this.binomialEngine.max;
	}

	stats() {
		console.log("Binomial Cache ==> stores: " + this.cacheStores + ", Hits: " + this.cacheHits + ", near miss: " + this.nearMiss + ", full calc: " + this.fullCalc);
	}
}




class BinomialEntry {

	constructor(k, n, bco) {
		this.k = k;
		this.n = n;
		this.bco = BigInt(bco);
		this.lastUsed = 0;

		Object.seal(this); // prevent new values being created
	}
}




class Binomial {

	constructor(max, lookup) {

		const start = Date.now();

		this.max = max;

		this.ps = new PrimeSieve(this.max);

		if (lookup < 10) {
			lookup = 10;
		}
		this.lookupLimit = lookup;

		const lookup2 = lookup / 2;

		this.binomialLookup = Array(lookup + 1);

		for (let total = 1; total <= lookup; total++) {

			this.binomialLookup[total] = Array(lookup2 + 1);

			for (let choose = 0; choose <= total / 2; choose++) {
				this.binomialLookup[total][choose] = this.generate(choose, total);
			}
		}

		console.log("Binomial coefficients look-up generated up to " + lookup + ", on demand up to " + max);
		console.log("Processing took " + (Date.now() - start) + " milliseconds");
	}


	generate(k, n) {

		if (n == 0 && k == 0) {
			return BigInt(1);
		}

		if (n < 1 || n > this.max) {
			throw new Error("Binomial: 1 <= n and n <= max required, but n was " + n + " and max was " + this.max);
		}

		if (0 > k || k > n) {
			console.log("Binomial: 0 <= k and k <= n required, but n was " + n + " and k was " + k);
			throw new Error("Binomial: 0 <= k and k <= n required, but n was " + n + " and k was " + k);
		}

		var choose = Math.min(k, n - k);

		var answer;
		if (n <= this.lookupLimit) {
			answer = this.binomialLookup[n][choose];
		}

		if (answer != null) {
			return answer;
		} else if (choose < 25) {
			return this.combination(choose, n);
		} else {
			return this.combinationLarge(choose, n);
		}

	}

    combination(mines, squares) {

		let top = BigInt(1);
		let bot = BigInt(1);

		const range = Math.min(mines, squares - mines);

		// calculate the combination.
		for (let i = 0; i < range; i++) {
			top = top * BigInt(squares - i);
			bot = bot* BigInt(i + 1);
		}

		const result = top / bot;

		return result;

	}


	combinationLarge(k, n) {

		if ((k == 0) || (k == n)) return BigInt(1);

		const n2 = n / 2;

		if (k > n2) {
			k = n - k;
		}

		const nk = n - k;

		const rootN = Math.floor(Math.sqrt(n));

		let result = BigInt(1);

		for (let prime = 2; prime <= n; prime++) {

			// we only want the primes
			if (!this.ps.isPrime(prime)) {
				continue;
            }

			if (prime > nk) {
				result = result * BigInt(prime);
				continue;
			}

			if (prime > n2) {
				continue;
			}

			if (prime > rootN) {
				if (n % prime < k % prime) {
					result = result * BigInt(prime);
				}
				continue;
			}

			let r = 0;
			let N = n;
			let K = k;
			let p = 1;

			let safety = 100;
			while (N > 0) {
				r = (N % prime) < (K % prime + r) ? 1 : 0;
				if (r == 1) {
					p *= prime;
				}
				N = Math.floor( N / prime);
				K = Math.floor( K / prime);
				//console.log("r=" + r + " N=" + N + " k=" + k + " p=" + p);
				safety--;
				if (safety < 1) {
					console.log("Safety stop!!!");
					break;
                }
			}
			if (p > 1) {
				result = result * BigInt(p);
			}
		}

		return result;
	}

}
/**
 * Minesweeper Probability Engine
 *
 * This is the core probability calculation engine for the minesweeper solver.
 * It uses constraint satisfaction techniques combined with exact probability calculations
 * to determine the safest moves and detect unavoidable guesses.
 *
 * Key concepts:
 * - Box: A group of tiles that share the same set of witness constraints
 * - Witness: A revealed tile with a number, creating constraints on adjacent tiles
 * - Probability Line: A solution configuration showing mine distributions across boxes
 * - Dead Tile Analysis: Detection of tiles that provide no new information when clicked
 * - 50/50 Detection: Finding unavoidable guess situations where tiles have equal probabilities
 */



class ProbabilityEngine {

    // Pre-calculated small binomial coefficients for performance optimization
    // Used for calculating combinations when distributing mines among tiles
    static SMALL_COMBINATIONS = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1], [1, 5, 10, 10, 5, 1], [1, 6, 15, 20, 15, 6, 1], [1, 7, 21, 35, 35, 21, 7, 1], [1, 8, 28, 56, 70, 56, 28, 8, 1]];

    /**
     * Constructor for the Probability Engine
     * @param {Board} board - The minesweeper board
     * @param {Array} allWitnesses - All revealed tiles with numbers (constraints)
     * @param {Array} allWitnessed - All unrevealed tiles adjacent to witnesses
     * @param {number} squaresLeft - Total unrevealed tiles remaining
     * @param {number} minesLeft - Total mines remaining to be found
     * @param {Object} options - Configuration options for the solver
     */
	constructor(board, allWitnesses, allWitnessed, squaresLeft, minesLeft, options) {

        this.board = board;
        this.options = options;
        this.playStyle = options.playStyle;
        this.verbose = options.verbose;

		this.witnessed = allWitnessed;

        this.duration = 0;

        // Pruned witnesses remove duplicates - witnesses that monitor the same set of tiles
        this.prunedWitnesses = [];  // a subset of allWitnesses with equivalent witnesses removed

        // Game state constraints
        this.minesLeft = minesLeft;
        this.tilesLeft = squaresLeft;
        this.TilesOffEdge = squaresLeft - allWitnessed.length;   // squares left off the edge and unrevealed
        this.minTotalMines = minesLeft - this.TilesOffEdge;   // minimum mines that must be on the edge
        this.maxTotalMines = minesLeft;

        // Core data structures for constraint satisfaction
        this.boxes = [];           // Groups of tiles with identical witness constraints
        this.boxWitnesses = [];    // Witnesses converted to BoxWitness objects
        this.mask = [];            // Tracks which boxes have been processed

        // Dead tile analysis - tiles that provide no information when revealed
        this.deadCandidates = [];  // Potentially dead tiles awaiting verification
        this.deadTiles = [];       // Confirmed dead tiles
        this.lonelyTiles = [];     // Tiles with no adjacent unrevealed tiles

        this.emptyBoxes = [];  // boxes which never contain mines - i.e. the set of safe tiles by Box

        // Probability calculation results
        this.boxProb = [];         // Final probability for each box
		this.workingProbs = [];    // Current probability lines being processed
        this.heldProbs = [];       // Stored probability lines from independent witness groups
        this.bestProbability = 0;  // Highest safety probability found
        this.offEdgeProbability = 0;          // Probability of tiles off the constraint edge
        this.offEdgeMineTally = 0;            // Expected mines off the edge
        this.bestOnEdgeProbability = BigInt(0); // Best probability on the constraint edge
        this.finalSolutionsCount = BigInt(0);   // Total number of valid game configurations

        // Safety analysis for move selection
        this.bestLivingSafety = 0;    // Safety of the best non-dead tile
        this.blendedSafety = 0;       // Weighted average of best and second-best safety
        this.singleSafestTile = null; // The uniquely safest living tile on the board

        // Independent witness analysis for optimization
        this.independentWitnesses = [];     // Witnesses that don't share tiles with others
        this.dependentWitnesses = [];       // Witnesses that do share tiles
        this.independentMines = 0;          // Mines in independent witness areas
        this.independentIterations = BigInt(1); // Number of independent configurations
        this.remainingSquares = 0;          // Squares not covered by independent witnesses

        // Local analysis results
        this.livingClearTile = 0;    // Count of clear tiles that aren't dead
        this.clearCount = 0;         // Total clear tiles found
        this.localClears = [];       // Tiles determined to be safe locally
        this.fullAnalysis = false;   // Whether complete probability analysis was performed

        this.minesFound = [];  // discovered mines are stored in here

        // Analysis control flags
        this.canDoDeadTileAnalysis = true;  // Whether dead tile analysis is still possible

        this.isolatedEdgeBruteForce = null; // Brute force solver for isolated edges

        this.validWeb = true;    // Whether the constraint web is mathematically valid
        this.recursions = 0;     // Counter for debugging recursive calls

        Object.seal(this); // prevent new values being created

        // Validate that we can calculate the required binomial coefficients
        if (binomialCache.getMaxN() < this.TilesOffEdge) {
            this.validWeb = false;
            this.writeToConsole("Too many floating tiles to calculate the Binomial Coefficient, max permitted is " + binomialCache.getMaxN());
            return;
        }

        // Basic validation - can't have negative mines
        if (minesLeft < 0) {
            this.validWeb = false;
            return;
        }

        // Generate BoxWitness objects and prune duplicates for optimization
        let pruned = 0;
        for (let i = 0; i < allWitnesses.length; i++) {
            const wit = allWitnesses[i];

            const boxWit = new BoxWitness(this.board, wit);

            // Validate witness constraints - mines to find must be within valid range
            if (boxWit.minesToFind < 0 || boxWit.minesToFind > boxWit.tiles.length) {
                this.validWeb = false;
            }

            // Check for duplicate witnesses (those monitoring identical tile sets)
            let duplicate = false;
            for (let j = 0; j < this.boxWitnesses.length; j++) {

                const w = this.boxWitnesses[j];

                if (w.equivalent(boxWit)) {
                    // This witness is equivalent to an existing one
                    duplicate = true;
                    break;
                }
            }
            if (!duplicate) {
                this.prunedWitnesses.push(boxWit);
             } else {
                pruned++;
            }
            this.boxWitnesses.push(boxWit);  // all witnesses are needed for the probability engine
        }
        this.writeToConsole("Pruned " + pruned + " witnesses as duplicates");
        this.writeToConsole("There are " + this.boxWitnesses.length + " Box witnesses");

        // Group tiles into boxes based on their shared witness constraints
        // Tiles that have the same set of adjacent witnesses belong to the same box
		let uid = 0;
		for (let i=0; i < this.witnessed.length; i++) {

			const tile = this.witnessed[i];

			let count = 0;

			// Count how many witnesses are adjacent to this tile
			for (let j=0; j < allWitnesses.length; j++) {
				if (tile.isAdjacent(allWitnesses[j])) {
					count++;
				}
			}

            // Try to fit this tile into an existing box
            let found = false;
			for (let j=0; j < this.boxes.length; j++) {

				if (this.boxes[j].fits(tile, count)) {
					this.boxes[j].add(tile);
					found = true;
					break;
				}

			}

			// If no existing box fits, create a new one
			if (!found) {
                this.boxes.push(new Box(this.boxWitnesses, tile, uid++));
			}

        }

        // Calculate mine constraints for each box
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            box.calculate(this.minesLeft);
            //console.log("Box " + box.tiles[0].asText() + " has min mines = " + box.minMines + " and max mines = " + box.maxMines);
        }

        // Report how many boxes each witness is adjacent to
        //for (var i = 0; i < this.boxWitnesses.length; i++) {
        //    var boxWit = this.boxWitnesses[i];
        //      console.log("Witness " + boxWit.tile.asText() + " is adjacent to " + boxWit.boxes.length + " boxes and has " + boxWit.minesToFind + " mines to find");
        //}



 	}

    /**
     * Checks for simple unavoidable guesses - single witnesses with 2 tiles and 1 mine
     * These represent pure 50/50 situations with no additional information available
     * @returns {Tile|null} The tile representing an unavoidable guess, or null if none found
     */
    checkForUnavoidableGuess() {

        // Look through pruned witnesses for potential unavoidable guesses
        for (let i = 0; i < this.prunedWitnesses.length; i++) {
            const witness = this.prunedWitnesses[i];

            // A simple 50/50: 1 mine to find among 2 tiles
            if (witness.minesToFind == 1 && witness.tiles.length == 2) {

                //console.log("Witness " + witness.tile.asText() + " is a possible unavoidable guess witness");
                let unavoidable = true;

                // Check if any monitoring tile can provide distinguishing information
                // If every tile that can see one of the candidates can also see the other,
                // then no future reveal can distinguish between the two candidates
                check: for (let j = 0; j < witness.tiles.length; j++) {
                    const tile = witness.tiles[j];

                    // Get all tiles that can monitor this candidate
                    for (let adjTile of this.board.getAdjacent(tile)) {

                        // Ignore tiles which are already known mines
                        if (adjTile.isSolverFoundBomb()) {
                            continue;
                        }

                        // Skip if this monitoring tile is one of our candidates
                        let toCheck = true;
                        for (let otherTile of witness.tiles) {
                            if (otherTile.isEqual(adjTile)) {
                                toCheck = false;
                                break;
                            }
                        }

                        // If this monitoring tile can see one candidate but not the other,
                        // then it could provide distinguishing information
                        if (toCheck) {
                            for (let otherTile of witness.tiles) {
                                if (!adjTile.isAdjacent(otherTile)) {

                                    //console.log("Tile " + adjTile.asText() + " is not monitoring all the other witnessed tiles");
                                    unavoidable = false;
                                    break check;
                                }
                            }
                        }
                    }
                }
                if (unavoidable) {
                    this.writeToConsole("Tile " + witness.tile.asText() + " is an unavoidable guess");
                    return witness.tiles[0];
                }
            }
        }

        return null;
    }


    /**
     * Checks for extended unavoidable 50/50 patterns by linking multiple witnesses together
     * This finds chains of connected 50/50 links that form larger unavoidable guess patterns
     * @returns {Array|null} Array of tiles forming an unavoidable 50/50 chain, or null if none found
     */
    checkForUnavoidable5050() {

        this.writeToConsole("Checking for unavoidable 50/50.");

        const links = [];

        // First pass: create links for all potential 50/50 witnesses
        for (let i = 0; i < this.prunedWitnesses.length; i++) {
            const witness = this.prunedWitnesses[i];

            // Only consider witnesses with exactly 1 mine to find among 2 tiles
            if (witness.minesToFind == 1 && witness.tiles.length == 2) {

                // Create a link representing this potential 50/50
                const link = new Link();
                link.tile1 = witness.tiles[0];
                link.tile2 = witness.tiles[1];

                //console.log("Witness " + witness.tile.asText() + " is a possible unavoidable guess witness");
                let unavoidable = true;

                // Check each tile in the link for "breaker" tiles that could provide information
                for (let j = 0; j < witness.tiles.length; j++) {
                    const tile = witness.tiles[j];

                    // Examine all tiles that could monitor this candidate
                    for (let adjTile of this.board.getAdjacent(tile)) {

                        // Skip known mines
                        if (adjTile.isSolverFoundBomb()) {
                            continue;
                        }

                        // Skip if this tile is one of our link candidates
                        let toCheck = true;
                        for (let otherTile of witness.tiles) {
                            if (otherTile.isEqual(adjTile)) {
                                toCheck = false;
                                break;
                            }
                        }

                        // If this monitoring tile can distinguish between the link candidates
                        if (toCheck) {
                            for (let otherTile of witness.tiles) {
                                if (!adjTile.isAdjacent(otherTile)) {

                                    //console.log("Tile " + adjTile.asText() + " is not monitoring all the other witnessed tiles");
                                    link.breaker.push(adjTile);  // This tile could break the 50/50
                                    if (tile.isEqual(link.tile1)) {
                                        link.closed1 = false;  // tile1 side is open (has breakers)
                                    } else {
                                        link.closed2 = false;  // tile2 side is open (has breakers)
                                    }

                                    unavoidable = false;
                                    //break check;
                                }
                            }
                        }
                    }
                }

                // If this link has no breakers, it's a simple unavoidable 50/50
                if (unavoidable) {
                    this.writeToConsole("Tile " + link.tile1.asText() + " is an unavoidable 50/50 guess");
                    return this.notDead([link.tile1, link.tile2]);
                }

                links.push(link);
            }
        }

        // Second pass: try to connect links together to form extended 50/50 chains
        let area5050 = [];  // The area covered by the current 50/50 chain

        // Attempt to connect 2 or more links together to form an unavoidable 50/50 pattern
        for (let link of links) {
            // Only process unprocessed links that have at least one open end
            if (!link.processed && (!link.closed2 || !link.closed1)) {

                let openTile;     // The current open end of our chain
                let openTile2;    // Second open end (if chain has two open ends)
                let extensions = 0;  // Number of extensions added to the original link

                // Determine which tiles are open (have potential breakers)
                if (!link.closed1) {
                    openTile = link.tile1;
                    if (!link.closed2) {
                        openTile2 = link.tile2;  // Both ends are open
                    }
                } else {
                    openTile = link.tile2;
                }

                // Initialize our 50/50 area with the starting link
                area5050 = [link.tile1, link.tile2];

                link.processed = true;

                let noMatch = false;
                // Keep extending the chain while we can find matching links
                while (openTile != null && !noMatch) {

                    noMatch = true;
                    // Look for another link that connects to our current open end
                    for (let extension of links) {
                        if (!extension.processed) {

                            // Check if this extension connects to our open tile
                            if (extension.tile1.isEqual(openTile)) {
                                extension.processed = true;
                                noMatch = false;

                                // Accumulate potential breakers from the extension
                                link.breaker.push(...extension.breaker);

                                // Add the new tile to our area (avoid duplicates)
                                if (openTile2 == null || !extension.tile2.isEqual(openTile2)) {
                                    extensions++;
                                    area5050.push(extension.tile2);   // tile2 is the new tile
                                }

                                // Update open tiles based on extension properties
                                if (extension.closed2 && openTile2 != null) {
                                    openTile = openTile2;
                                    openTile2 = null;
                                }
                                else if (extension.closed2 || openTile2 != null && extension.tile2.isEqual(openTile2)) {
                                    // Chain is closed - check if it forms a valid 50/50
                                    if (extensions % 2 == 0 && this.noBreaker(link, area5050)) {
                                        this.writeToConsole("Tile " + openTile.asText() + " is an unavoidable guess, with " + extensions + " extensions");
                                        return this.notDead(area5050);
                                    } else {
                                        this.writeToConsole("Tile " + openTile.asText() + " is a closed extension with " + (extensions + 1) + " parts");
                                        openTile = null;
                                    }
                                } else {  // Extension continues the chain
                                    openTile = extension.tile2;
                                }
                                break;
                            }

                            // Check if extension connects via tile2
                            if (extension.tile2.isEqual(openTile)) {
                                extension.processed = true;
                                noMatch = false;

                                // Accumulate potential breakers
                                link.breaker.push(...extension.breaker);

                                // Add new tile to area
                                if (openTile2 == null || !extension.tile1.isEqual(openTile2)) {
                                    extensions++;
                                    area5050.push(extension.tile1);   // tile1 is the new tile
                                }

                                // Update open tiles
                                if (extension.closed1 && openTile2 != null) {
                                    openTile = openTile2;
                                    openTile2 = null;
                                }
                                else if (extension.closed1 || openTile2 != null && extension.tile1.isEqual(openTile2)) {
                                    // Chain closed
                                    if (extensions % 2 == 0 && this.noBreaker(link, area5050)) {
                                        this.writeToConsole("Tile " + openTile.asText() + " is an unavoidable guess, with " + extensions + " extensions");
                                        return this.notDead(area5050);
                                    } else {
                                        this.writeToConsole("Tile " + openTile.asText() + " is a closed extension with " + (extensions + 1) + " parts");
                                        openTile = null;
                                    }

                                } else {  // Chain continues
                                    openTile = extension.tile1;
                                }

                                break;
                            }

                        }

                    }

                }

            }
        }

        return null;
    }

    checkForUnavoidable5050OrPseudo() {

        this.writeToConsole("Checking for unavoidable 50/50 or pseudo 50/50.");

        const links = [];
        const pseudoLinks = [];

        for (let i = 0; i < this.prunedWitnesses.length; i++) {
            const witness = this.prunedWitnesses[i];

            if (witness.minesToFind == 1) {

                // create a new link
                const link = new Link();
                link.witness = witness;

                if (witness.tiles.length == 2) {
                    link.tile1 = witness.tiles[0];
                    link.tile2 = witness.tiles[1];

                    //this.writeToConsole("Tiles " + link.tile1.asText() + " and " + link.tile2.asText() + " form a simple link");

                    this.assessLink(link);
                    links.push(link);

                } else {
                    const rooted = this.findRootedLinks(witness);
                    if (rooted.length == 0) {
                        //this.writeToConsole("Witness " + witness.tile.asText() + " is a possible pseudo connection");

                        pseudoLinks.push(witness);
                    }

                    links.push(...rooted);
                }
            }
        }

        // if there is an unavoidable link then return that, prioritising real 50/50s over pseudo
        let unavoidableLink = null;
        for (let link of links) {
            if (link.unavoidable) {
                unavoidableLink = link;
                if (!link.pseudo) {
                    break;
                }
            }
        }
        if (unavoidableLink != null) {
            this.writeToConsole("Tiles " + unavoidableLink.tile1.asText() + " and " + unavoidableLink.tile2.asText() + " form an unavoidable 50/50 guess");
            return this.notDead([unavoidableLink.tile1, unavoidableLink.tile2]);
        }

        // this is the area the 50/50 spans
        //let area5050 = [];
        const chains = [];

        // try and connect 2 or more links together to form an unavoidable 50/50
        for (let link of links) {
            //if (!link.processed && (!link.closed2 && link.closed1 || !link.closed1 && link.closed2)) {  // one end open and one closed
            if (!link.processed && (!link.closed1 || !link.closed2)) {  // at least one end open

                const chain = new Chain();
                chain.whole5050.push(link.tile1);
                chain.whole5050.push(link.tile2);
                chain.breaker.push(...link.breaker);

                if (link.pseudo) {
                    chain.pseudo = true;
                }

                let extensions = 0;
                if (!link.closed1) {
                    chain.openTile = link.tile1;
                    if (!link.closed2) {
                        chain.openTile2 = link.tile2;
                    }
                }
                else {
                    chain.openTile = link.tile2;
                }

                if (!link.dead1) {
                    chain.living5050.push(link.tile1);
                    if (link.pseudo) {
                        chain.pseudoTiles.push(link.tile1);
                    }
                }
                if (!link.dead2) {
                    chain.living5050.push(link.tile2);
                    if (link.pseudo) {
                        chain.pseudoTiles.push(link.tile2);
                    }
                }
                //area5050 = [link.tile1, link.tile2];

                link.processed = true;

                let noMatch = false;
                while (chain.openTile != null && !noMatch) {

                    noMatch = true;
                    for (let extension of links) {
                        if (!extension.processed && !(chain.pseudo && extension.pseudo)) {  // can't add another pseudo link to an already pseudo chain

                            if (extension.tile1.isEqual(chain.openTile)) {

                                //this.writeToConsole("Tile " + extension.tile1.asText() + " extends the current chain");

                                extension.processed = true;
                                noMatch = false;

                                if (extension.pseudo) {
                                    chain.pseudo = true;

                                    if (!extension.dead1) {
                                        chain.pseudoTiles.push(extension.tile1);
                                    }
                                    if (!extension.dead2) {
                                        chain.pseudoTiles.push(extension.tile2);
                                    }
                                }

                                // accumulate the potential breaker tiles as we progress;
                                chain.breaker.push(...extension.breaker);

                                if (chain.openTile2 == null || !extension.tile2.isEqual(chain.openTile2)) {
                                    extensions++;
                                    chain.whole5050.push(extension.tile2);   // tile2 is the new tile

                                    if (!extension.dead2) {
                                        chain.living5050.push(extension.tile2);
                                    }
                                }

                                if (extension.closed2 && chain.openTile2 != null) {
                                    chain.openTile = chain.openTile2;
                                    chain.openTile2 = null;
                                }
                                else if (extension.closed2 || chain.openTile2 != null && extension.tile2.isEqual(chain.openTile2)) {
                                    if (extensions % 2 == 0 && this.noBreaker(chain, chain.whole5050)) {
                                        this.writeToConsole("Tile " + chain.openTile.asText() + " is an unavoidable guess, with " + extensions + " extensions");

                                        if (extension.pseudo) {
                                            return this.notDead([extension.tile1, extension.tile2]);
                                        } else if (chain.living5050.length != 0) {
                                            return chain.living5050;
                                        } else {
                                            return chain.whole5050;
                                        }

                                    } else {
                                        this.writeToConsole("Tile " + chain.openTile.asText() + " is a closed extension with " + (extensions + 1) + " parts");
                                        chain.openTile = null;
                                    }
                                } else {  // found an open extension, now look for an extension for this
                                    chain.openTile = extension.tile2;
                                }
                                break;
                            }
                            if (extension.tile2.isEqual(chain.openTile)) {

                                //this.writeToConsole("Tile " + extension.tile2.asText() + " extends the current chain");

                                extension.processed = true;
                                noMatch = false;

                                if (extension.pseudo) {
                                    chain.pseudo = true;

                                    if (!extension.dead1) {
                                        chain.pseudoTiles.push(extension.tile1);
                                    }
                                    if (!extension.dead2) {
                                        chain.pseudoTiles.push(extension.tile2);
                                    }
                                }

                                // accumulate the potential breaker tiles as we progress;
                                chain.breaker.push(...extension.breaker);

                                if (chain.openTile2 == null || !extension.tile1.isEqual(chain.openTile2)) {
                                    extensions++;
                                    chain.whole5050.push(extension.tile1);   // tile 1 is the new tile

                                    if (!extension.dead1) {
                                        chain.living5050.push(extension.tile1);
                                    }
                                }

                                if (extension.closed1 && chain.openTile2 != null) {
                                    chain.openTile = chain.openTile2;
                                    chain.openTile2 = null;
                                }
                                else if (extension.closed1 || chain.openTile2 != null && extension.tile1.isEqual(chain.openTile2)) {
                                    if (extensions % 2 == 0 && this.noBreaker(chain, chain.whole5050)) {
                                        this.writeToConsole("Tile " + chain.openTile.asText() + " is an unavoidable guess, with " + extensions + " extensions");

                                        if (extension.pseudo) {
                                            return this.notDead([extension.tile1, extension.tile2]);
                                        } else if (chain.living5050.length != 0) {
                                            return chain.living5050;
                                        } else {
                                            return chain.whole5050;
                                        }

                                    } else {
                                        this.writeToConsole("Tile " + chain.openTile.asText() + " is a closed extension with " + (extensions + 1) + " parts");
                                        chain.openTile = null;
                                    }

                                } else {  // found an open extension, now look for an extension for this
                                    chain.openTile = extension.tile1;
                                }

                                break;
                            }

                        }

                    }

                    // if we didn't match open tile 1 but open tile 2 is still unprocessed then go back and see if we can extend that.
                    if (noMatch && chain.openTile2 != null && !chain.secondPass) {

                        //this.writeToConsole("Tile " + chain.openTile2.asText() + " will now be processed");

                        // swap them over
                        const temp = chain.openTile;
                        chain.openTile = chain.openTile2;
                        chain.openTile2 = temp;

                        chain.secondPass = true;
                        noMatch = false;
                    }

                }

                if (noMatch && chain.openTile2 == null) {
                    let openTile1 = "null";
                    if (chain.openTile != null) {
                        openTile1 = chain.openTile.asText();
                    }

                    this.writeToConsole("Tile " + openTile1 + " is the open end of a chain consisting of " + (chain.whole5050.length) + " tiles");
                    chains.push(chain);
                }

            }
        }


        // can we join two chains together using a pseudo-link
        top: for (let i = 0; i < pseudoLinks.length; i++) {
            const witness = pseudoLinks[i];

            let chain1 = null;
            let chain2 = null;

            let tally1;
            let tally2;

            search: for (let tile of witness.tiles) {
                for (const chain of chains) {
                    if (chain.openTile.isEqual(tile)) {
                        if (chain1 == null) {
                            chain1 = chain;
                            tally1 = this.getBox(tile).mineTally;
                            break;
                        } else {
                            chain2 = chain;
                            tally2 = this.getBox(tile).mineTally;
                            break search;
                        }
                    }
                }
            }

            if (chain1 != null && chain2 != null ) {  // can't connect two pseudo chains together

                const linker = new Link();
                linker.tile1 = chain1.openTile;
                linker.tile2 = chain2.openTile;

                this.assessLink(linker);

                const combinedChain = new Chain();
                combinedChain.whole5050.push(...chain1.whole5050);
                combinedChain.whole5050.push(...chain2.whole5050);

                combinedChain.breaker.push(...linker.breaker);
                combinedChain.breaker.push(...chain1.breaker);
                combinedChain.breaker.push(...chain2.breaker);

                // If both chains are pseudos then make sure the chosen tile is the safest
                if (chain1.pseudo && chain2.pseudo) {
                    let lowestTally;
                    if (tally1 < tally2) {
                        lowestTally = tally1;
                    } else {
                        lowestTally = tally2;
                    }
                    for (const tile of combinedChain.whole5050) {
                        if (this.getBox(tile).mineTally < lowestTally) {
                            continue top;  // if there is a safer tile then this potential pseudo is broken
                        }
                    }
                }

                if (combinedChain.whole5050.length % 2 == 0 && this.noBreaker(combinedChain, combinedChain.whole5050)) {
                    if (tally1 == tally2) {
                        return this.notDead([chain1.openTile, chain2.openTile]);
                    } else if (tally1 < tally2) {
                        return [chain1.openTile];
                    } else {
                        return [chain2.openTile];
                    }
                }
            }
         }

        return null;
    }

    findRootedLinks(witness) {

        const links = [];

        for (let i = 0; i < witness.tiles.length; i++) {
            const tile1 = witness.tiles[i];

            for (let j = 0; j < witness.tiles.length; j++) {
                const tile2 = witness.tiles[j];

                if (tile2.getX() == tile1.getX() && tile2.getY() == tile1.getY() - 1) {

                    const link = new Link();
                    link.witness = witness;
                    link.pseudo = true;
                    link.tile1 = tile1;
                    link.tile2 = tile2;

                    this.assessLink(link);
                    if (link.closed1 || link.closed2) {
                        if (!link.dead1 || !link.dead2) {
                            links.push(link);
                        }
                    }
                }

                if (tile2.getX() == tile1.getX() + 1 && tile2.getY() == tile1.getY()) {

                    const link = new Link();
                    link.witness = witness;
                    link.pseudo = true;
                    link.tile1 = tile1;
                    link.tile2 = tile2;

                    this.assessLink(link);
                    if (link.closed1 || link.closed2) {
                        if (!link.dead1 || !link.dead2) {
                            links.push(link);
                        }
                    }
                }
            }
        }

        return links;

    }

    assessLink(link) {

        const tiles = [link.tile1, link.tile2];

        // if every monitoring tile also monitors all the other tiles then it can't provide any information
        for (let j = 0; j < tiles.length; j++) {
            const tile = tiles[j];

            // get the witnesses monitoring this tile
            for (let adjTile of this.board.getAdjacent(tile)) {

                // ignore tiles which are mines
                if (adjTile.isSolverFoundBomb()) {
                    continue;
                }

                // are we one of the tiles other tiles, if so then no need to check
                let toCheck = true;
                for (let otherTile of tiles) {
                    if (otherTile.isEqual(adjTile)) {
                        toCheck = false;
                        break;
                    }
                }

                // if we are monitoring and not a mine then see if we are also monitoring all the other mines
                if (toCheck) {
                    for (let otherTile of tiles) {
                        if (!adjTile.isAdjacent(otherTile)) {

                            //console.log("Tile " + adjTile.asText() + " is not monitoring all the other witnessed tiles");
                            link.breaker.push(adjTile);
                            if (tile.isEqual(link.tile1)) {
                                link.closed1 = false;
                            } else {
                                link.closed2 = false;
                            }

                            link.unavoidable = false;
                        }
                    }
                }
            }
        }

        link.dead1 = this.isDead(link.tile1);
        link.dead2 = this.isDead(link.tile2);

    }

    // return a tile which isn't dead
    notDead(area) {

        const result = [];

        for (let tile of area) {
             if (!this.isDead(tile)) {
                result.push(tile);
            }
        }

        // if all dead return the input, otherwise only the living tiles
        if (result.length == 0) {
            return area;
        } else {
            return result;
        }

        // if they are all dead, return the first
        //return area[0];
    }

    isDead(tile) {

        for (let deadTile of this.deadTiles) {
            if (deadTile.isEqual(tile)) {
                return true;
            }
        }

        return false;

    }

    isNewMine(tile) {

        for (let mine of this.minesFound) {
            if (mine.isEqual(tile)) {
                return true;
            }
        }

        return false;

    }

    noBreaker(link, area) {

        // each potential breaker location must be adjacent to 2 tiles in the extended 50/50
        top: for (let tile of link.breaker) {

            for (let tile5050 of area) {
                if (tile.isEqual(tile5050)) {
                    continue top;    //if a breaker tile is part of the 50/50 it can't break it
                }
            }


            let adjCount = 0;
            for (let tile5050 of area) {
                if (tile.isAdjacent(tile5050)) {
                    adjCount++;
                }
            }
            if (adjCount % 2 !=0) {
                this.writeToConsole("Tile " + tile.asText() + " breaks the 50/50 as it isn't adjacent to an even number of tiles in the extended candidate 50/50, adjacent " + adjCount + " of " + area.length);
                return false;
            }
        }

        return true;

    }

    /**
     * Main probability calculation method - the heart of the probability engine
     * This orchestrates the constraint satisfaction and probability calculation process
     */
	process() {

        // If the board isn't valid then solution count is zero
        if (!this.validWeb) {
            this.finalSolutionsCount = BigInt(0);
            this.clearCount = 0;
            //console.log("Invalid web");
            return;
        }

        const peStart = Date.now();

        // Create an array showing which boxes have been processed this iteration - none to start
        this.mask = Array(this.boxes.length).fill(false);

        // Identify locations which could be dead (provide no information when revealed)
        this.getCandidateDeadLocations();

		// Create an initial solution configuration of no mines anywhere
        this.heldProbs.push(new ProbabilityLine(this.boxes.length, BigInt(1)));

		// Start with a single empty probability line
        this.workingProbs.push(new ProbabilityLine(this.boxes.length, BigInt(1)));

        // Begin iterative constraint satisfaction process
        let nextWitness = this.findFirstWitness();

        // Process witnesses iteratively, building up probability distributions
        while (nextWitness != null) {

            //console.log("Probability engine processing witness " + nextWitness.boxWitness.tile.asText());

            // Mark the boxes associated with this witness as processed
            for (let i = 0; i < nextWitness.newBoxes.length; i++) {
                this.mask[nextWitness.newBoxes[i].uid] = true;
            }

            // Merge the current witness constraints with existing probability lines
            this.workingProbs = this.mergeProbabilities(nextWitness);

            // Find the next witness to process
            nextWitness = this.findNextWitness(nextWitness);

        }

        // Decide whether to do full analysis or stop early if we found local solutions
        if (this.localClears.length == 0 || this.options.forceAnalysis) {
            this.calculateBoxProbabilities();  // Full probability calculation
        } else {
            this.bestProbability = 1;  // We found definite safe moves, no need for probabilities
        }

        // Log whether we performed complete analysis
        if (this.fullAnalysis) {
            this.writeToConsole("The probability engine did a full analysis - probability data is available")
        } else {
            this.writeToConsole("The probability engine did a truncated analysis - probability data is not available")
        }

        this.duration = Date.now() - peStart;


	}


    // take the next witness details and merge them into the currently held details
    mergeProbabilities(nw) {

        const newProbs = [];

        for (let i = 0; i < this.workingProbs.length; i++) {

            const pl = this.workingProbs[i];

            const missingMines = nw.boxWitness.minesToFind - this.countPlacedMines(pl, nw);

            if (missingMines < 0) {
                //console.log("Missing mines < 0 ==> ignoring line");
                // too many mines placed around this witness previously, so this probability can't be valid
            } else if (missingMines == 0) {
                //console.log("Missing mines = 0 ==> keeping line as is");
                newProbs.push(pl);   // witness already exactly satisfied, so nothing to do
            } else if (nw.newBoxes.length == 0) {
                //console.log("new boxes = 0 ==> ignoring line since nowhere for mines to go");
                // nowhere to put the new mines, so this probability can't be valid
            } else {

                const result = this.distributeMissingMines(pl, nw, missingMines, 0);
                newProbs.push(...result);

            }

        }

        // flag the last set of details as processed
        nw.boxWitness.processed = true;

        for (let i = 0; i < nw.newBoxes.length; i++) {
            nw.newBoxes[i].processed = true;
        }

        //if we haven't compressed yet and we are still a small edge then don't compress
        if (newProbs.length < 100 && this.canDoDeadTileAnalysis) {
            return newProbs;
        }

        // about to compress the line
        this.canDoDeadTileAnalysis = false;

        const boundaryBoxes = [];
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            let notProcessed = false;
            let processed = false;
            for (let j = 0; j < box.boxWitnesses.length; j++) {
                if (box.boxWitnesses[j].processed) {
                    processed = true;
                } else {
                    notProcessed = true;
                }
                if (processed && notProcessed) {
                    //boardState.display("partially processed box " + box.getUID());
                    boundaryBoxes.push(box);
                    break;
                }
            }
        }
        //boardState.display("Boxes partially processed " + boundaryBoxes.size());

        const sorter = new MergeSorter(boundaryBoxes);

        const crunched = this.crunchByMineCount(newProbs, sorter);

        //if (newProbs.length == 0) {
        //     console.log("Returning no lines from merge probability !!");
        //}

         return crunched;

    }

    // counts the number of mines already placed
    countPlacedMines(pl, nw) {

        let result = 0;

        for (let i = 0; i < nw.oldBoxes.length; i++) {

            const b = nw.oldBoxes[i];

            result = result + pl.allocatedMines[b.uid];
        }

        return result;
    }

    // this is used to recursively place the missing Mines into the available boxes for the probability line
    distributeMissingMines(pl, nw,  missingMines, index) {

        //console.log("Distributing " + missingMines + " missing mines to box " + nw.newBoxes[index].uid);

        this.recursions++;
        if (this.recursions % 1000 == 0) {
            this.writeToConsole("Probability Engine recursision = " + this.recursions);
        }

        const result = [];

        // if there is only one box left to put the missing mines we have reach the end of this branch of recursion
        if (nw.newBoxes.length - index == 1) {
            // if there are too many for this box then the probability can't be valid
            if (nw.newBoxes[index].maxMines < missingMines) {
                //console.log("Abandon (1)");
                return result;
            }
            // if there are too few for this box then the probability can't be valid
            if (nw.newBoxes[index].minMines > missingMines) {
                //console.log("Abandon (2)");
                return result;
            }
            // if there are too many for this game then the probability can't be valid
            if (pl.mineCount + missingMines > this.maxTotalMines) {
                //console.log("Abandon (3)");
                return result;
            }

            // otherwise place the mines in the probability line
            //pl.mineBoxCount[nw.newBoxes[index].uid] = BigInt(missingMines);
            //pl.mineCount = pl.mineCount + missingMines;
            result.push(this.extendProbabilityLine(pl, nw.newBoxes[index], missingMines));
            //console.log("Distribute missing mines line after " + pl.mineBoxCount);
            return result;
        }


        // this is the recursion
        const maxToPlace = Math.min(nw.newBoxes[index].maxMines, missingMines);

        for (let i = nw.newBoxes[index].minMines; i <= maxToPlace; i++) {
            const npl = this.extendProbabilityLine(pl, nw.newBoxes[index], i);

            const r1 = this.distributeMissingMines(npl, nw, missingMines - i, index + 1);
            result.push(...r1);
        }

        return result;

    }

    // create a new probability line by taking the old and adding the mines to the new Box
    extendProbabilityLine(pl, newBox, mines) {

        //console.log("Extended probability line: Adding " + mines + " mines to box " + newBox.uid);
        //console.log("Extended probability line before" + pl.mineBoxCount);

        // there are less ways to place the mines if we know one of the tiles doesn't contain a mine
        const modifiedTilesCount = newBox.tiles.length - newBox.emptyTiles;

        const combination = ProbabilityEngine.SMALL_COMBINATIONS[modifiedTilesCount][mines];
        //const combination = ProbabilityEngine.SMALL_COMBINATIONS[newBox.tiles.length][mines];
        const bigCom = BigInt(combination);

        const newSolutionCount = pl.solutionCount * bigCom;

        const result = new ProbabilityLine(this.boxes.length, newSolutionCount);

        result.mineCount = pl.mineCount + mines;

        // copy the probability array

        if (combination != 1) {
            for (let i = 0; i < pl.mineBoxCount.length; i++) {
                result.mineBoxCount[i] = pl.mineBoxCount[i] * bigCom;
            }
        } else {
            result.mineBoxCount = pl.mineBoxCount.slice();
        }

        result.mineBoxCount[newBox.uid] = BigInt(mines) * result.solutionCount;

        result.allocatedMines = pl.allocatedMines.slice();
        result.allocatedMines[newBox.uid] = mines;

        //console.log("Extended probability line after " + result.mineBoxCount);

        return result;
    }


    // this combines newly generated probabilities with ones we have already stored from other independent sets of witnesses
    storeProbabilities() {

        //console.log("At store probabilities");

        const result = [];

        //this.checkCandidateDeadLocations();

        if (this.workingProbs.length == 0) {
            //this.writeToConsole("working probabilites list is empty!!", true);
            this.heldProbs = [];
        	return;
        }

        // crunch the new ones down to one line per mine count
        //var crunched = this.crunchByMineCount(this.workingProbs);

        const crunched = this.workingProbs;

        if (crunched.length == 1) {
            this.checkEdgeIsIsolated();
        }

        //solver.display("New data has " + crunched.size() + " entries");

        for (let i = 0; i < crunched.length; i++) {

            pl = crunched[i];

            for (let j = 0; j < this.heldProbs.length; j++) {

                const epl = this.heldProbs[j];

                const npl = new ProbabilityLine(this.boxes.length);

                npl.mineCount = pl.mineCount + epl.mineCount;

                if (npl.mineCount <= this.maxTotalMines) {

                    npl.solutionCount = pl.solutionCount * epl.solutionCount;

                    for (let k = 0; k < npl.mineBoxCount.length; k++) {

                        const w1 = pl.mineBoxCount[k] * epl.solutionCount;
                        const w2 = epl.mineBoxCount[k] * pl.solutionCount;
                        npl.mineBoxCount[k] = w1 + w2;

                    }
                    result.push(npl);

                }
            }
        }

        // sort into mine order
        result.sort(function (a, b) { return a.mineCount - b.mineCount });

        this.heldProbs = [];

        // if result is empty this is an impossible position
        if (result.length == 0) {
            return;
        }

        // and combine them into a single probability line for each mine count
        let mc = result[0].mineCount;
        let npl = new ProbabilityLine(this.boxes.length);
        npl.mineCount = mc;

        for (let i = 0; i < result.length; i++) {

            var pl = result[i];

            if (pl.mineCount != mc) {
                this.heldProbs.push(npl);
                mc = pl.mineCount;
                npl = new ProbabilityLine(this.boxes.length);
                npl.mineCount = mc;
            }
            npl.solutionCount = npl.solutionCount + pl.solutionCount;

            for (let j = 0; j < pl.mineBoxCount.length; j++) {
                npl.mineBoxCount[j] = npl.mineBoxCount[j] + pl.mineBoxCount[j];
            }
        }

        this.heldProbs.push(npl);

    }

    crunchByMineCount(target, sorter) {

        if (target.length == 0) {
            return target;
         }

        // sort the solutions by number of mines
        target.sort(function (a, b) { return sorter.compare(a,b) });

        const result = [];

        let current = null;

        for (let i = 0; i < target.length; i++) {

            const pl = target[i];

            if (current == null) {
                current = target[i];
            } else if (sorter.compare(current, pl) != 0) {
                result.push(current);
                current = pl;
            } else {
                this.mergeLineProbabilities(current, pl);
            }

        }

        //if (npl.mineCount >= minTotalMines) {
        result.push(current);
        //}

        this.writeToConsole(target.length + " Probability Lines compressed to " + result.length);

        return result;

    }

    // calculate how many ways this solution can be generated and roll them into one
    mergeLineProbabilities(npl, pl) {

        /*
        var solutions = BigInt(1);
        for (var i = 0; i < pl.mineBoxCount.length; i++) {
            solutions = solutions * BigInt(this.SMALL_COMBINATIONS[this.boxes[i].tiles.length][pl.mineBoxCount[i]]);
        }

        npl.solutionCount = npl.solutionCount + solutions;
        */

        npl.solutionCount = npl.solutionCount + pl.solutionCount;

        for (let i = 0; i < pl.mineBoxCount.length; i++) {
            if (this.mask[i]) {  // if this box has been involved in this solution - if we don't do this the hash gets corrupted by boxes = 0 mines because they weren't part of this edge
                npl.mineBoxCount[i] = npl.mineBoxCount[i] + pl.mineBoxCount[i];
            }

        }

    }

    // return any witness which hasn't been processed
    findFirstWitness() {

        for (let i = 0; i < this.boxWitnesses.length; i++) {
            const boxWit = this.boxWitnesses[i];
            if (!boxWit.processed) {
                return new NextWitness(boxWit);
            }
        }

        return null;
    }

    // look for the next witness to process
    findNextWitness(prevWitness) {

        let bestTodo = 99999;
        let bestWitness = null;

        // and find a witness which is on the boundary of what has already been processed
        for (let i = 0; i < this.boxes.length; i++) {
            const b = this.boxes[i];
            if (b.processed) {
                for (let j = 0; j < b.boxWitnesses.length; j++) {
                    const w = b.boxWitnesses[j];
                    if (!w.processed) {
                        let todo = 0;
                        for (let k = 0; k < w.boxes.length; k++) {
                            const b1 = w.boxes[k];

                            if (!b1.processed) {
                                todo++;
                            }
                        }
                        if (todo == 0) {    // prioritise the witnesses which have the least boxes left to process
                            return new NextWitness(w);
                        } else if (todo < bestTodo) {
                            bestTodo = todo;
                            bestWitness = w;
                        }
                    }
                }
            }
        }

        if (bestWitness != null) {
            return new NextWitness(bestWitness);
        } else {
            this.writeToConsole("Ending independent edge");
        }

        // if we are down here then there is no witness which is on the boundary, so we have processed a complete set of independent witnesses

        // if playing for efficiency check all edges, slower but we get better information
        if (this.playStyle != PLAY_STYLE_EFFICIENCY && this.playStyle != PLAY_STYLE_NOFLAGS_EFFICIENCY && !this.options.analysisMode && !this.options.fullProbability) {

            // look to see if this sub-section of the edge has any certain clears
            for (let i = 0; i < this.mask.length; i++) {
                if (this.mask[i]) {

                    let isClear = true;
                    for (let j = 0; j < this.workingProbs.length; j++) {
                        const wp = this.workingProbs[j];
                        if (wp.mineBoxCount[i] != 0) {
                            isClear = false;
                            break;
                        }
                    }
                    if (isClear) {
                        // if the box is locally clear then store the tiles in it
                        for (let j = 0; j < this.boxes[i].tiles.length; j++) {

                            const tile = this.boxes[i].tiles[j];

                            this.writeToConsole(tile.asText() + " has been determined to be locally clear");
                            this.localClears.push(tile);
                        }
                    }

                    let isFlag = true;
                    for (let j = 0; j < this.workingProbs.length; j++) {
                        const wp = this.workingProbs[j];
                        if (wp.mineBoxCount[i] != wp.solutionCount * BigInt(this.boxes[i].tiles.length)) {
                            isFlag = false;
                            break;
                        }
                    }
                    if (isFlag) {
                        // if the box contains all mines then store the tiles in it
                        for (let j = 0; j < this.boxes[i].tiles.length; j++) {
                            const tile = this.boxes[i].tiles[j];
                            this.writeToConsole(tile.asText() + " has been determined to be locally a mine");
                            this.minesFound.push(tile);
                        }
                    }
                }
            }

            // if we have found some local clears then stop and use these
            if (this.localClears.length > 0 && !this.options.forceAnalysis) {
                return null;
            }

        }


        //independentGroups++;

        this.checkCandidateDeadLocations(this.canDoDeadTileAnalysis);

        // if we haven't compressed yet then do it now
        if (this.canDoDeadTileAnalysis) {
            const sorter = new MergeSorter();
            this.workingProbs = this.crunchByMineCount(this.workingProbs, sorter);
        } else {
            this.canDoDeadTileAnalysis = true;
        }

        // since we have calculated all the mines in an independent set of witnesses we can crunch them down and store them for later

        // get an unprocessed witness
        const nw = this.findFirstWitness();
        if (nw != null) {
            this.writeToConsole("Starting a new independent edge");
        }

        // Store the probabilities for later consolidation
        this.storeProbabilities();

        // reset the working array so we can start building up one for the new set of witnesses
        this.workingProbs = [new ProbabilityLine(this.boxes.length, BigInt(1))];

        // reset the mask indicating that no boxes have been processed
        this.mask.fill(false);


        // return the next witness to process
        return nw;

    }


    // check the candidate dead locations with the information we have - remove those that aren't dead
    checkCandidateDeadLocations(checkPossible) {

        let completeScan;
        if (this.TilesOffEdge == 0) {
            completeScan = true;   // this indicates that every box has been considered in one sweep (only 1 independent edge)
            for (let i = 0; i < this.mask.length; i++) {
                if (!this.mask[i]) {
                    completeScan = false;
                    break;
                }
            }
            if (completeScan) {
                this.writeToConsole("This is a complete scan");
            } else {
                this.writeToConsole("This is not a complete scan");
            }
        } else {
            completeScan = false;
            this.writeToConsole("This is not a complete scan because there are squares off the edge");
        }


        for (let i = 0; i < this.deadCandidates.length; i++) {

            const dc = this.deadCandidates[i];

            if (dc.isAlive) {  // if this location isn't dead then no need to check any more
                continue;
            }

            // only do the check if all the boxes have been analysed in this probability iteration
            let boxesInScope = 0;
            for (let j = 0; j < dc.goodBoxes.length; j++) {
                const b = dc.goodBoxes[j];
                if (this.mask[b.uid]) {
                    boxesInScope++;
                }
            }
            for (let j = 0; j < dc.badBoxes.length; j++) {
                const b = dc.badBoxes[j];
                if (this.mask[b.uid]) {
                    boxesInScope++;
                }
            }
            if (boxesInScope == 0) {
                continue;
            } else if (boxesInScope != dc.goodBoxes.length + dc.badBoxes.length) {
                this.writeToConsole("Location " + dc.candidate.asText() + " has some boxes in scope and some out of scope so assumed alive");
                dc.isAlive = true;
                continue;
            }

            //if we can't do the check because the edge has been compressed mid process then assume alive
            if (!checkPossible) {
                this.writeToConsole("Location " + dc.candidate.asText() + " was on compressed edge so assumed alive");
                dc.isAlive = true;
                continue;
            }

            let okay = true;
            let mineCount = 0;
            line: for (let j = 0; j < this.workingProbs.length; j++) {

                const pl = this.workingProbs[j];

                if (completeScan && pl.mineCount != this.minesLeft) {
                    continue line;
                }

                // ignore probability lines where the candidate is a mine
                if (pl.allocatedMines[dc.myBox.uid] == dc.myBox.tiles.length) {
                    mineCount++;
                    continue line;
                }

                // all the bad boxes must be zero
                for (let k = 0; k < dc.badBoxes.length; k++) {

                    const b = dc.badBoxes[k];

                    let neededMines;
                    if (b.uid == dc.myBox.uid) {
                        neededMines = BigInt(b.tiles.length - 1) * pl.solutionCount;
                    } else {
                        neededMines = BigInt(b.tiles.length) * pl.solutionCount;
                    }

                    // a bad box must have either no mines or all mines
                    if (pl.mineBoxCount[b.uid] != 0 && pl.mineBoxCount[b.uid] != neededMines) {
                        this.writeToConsole("Location " + dc.candidate.asText() + " is not dead because a bad box has neither zero or all mines: " + pl.mineBoxCount[b.uid] + "/" + neededMines);
                        okay = false;
                        break line;
                    }
                }

                let tally = 0;
                // the number of mines in the good boxes must always be the same
                for (let k = 0; k < dc.goodBoxes.length; k++) {
                    const b = dc.goodBoxes[k];
                    tally = tally + pl.allocatedMines[b.uid];
                }
                //boardState.display("Location " + dc.candidate.display() + " has mine tally " + tally);
                if (dc.firstCheck) {
                    dc.total = tally;
                    dc.firstCheck = false;
                } else {
                    if (dc.total != tally) {
                        this.writeToConsole("Location " + dc.candidate.asText() + " is not dead because the sum of mines in good boxes is not constant. Was "
                            + dc.total + " now " + tally + ". Mines in probability line " + pl.mineCount);
                        okay = false;
                        break;
                    }
                }
            }

            // if a check failed or every this tile is a mine for every solution then it is alive
            if (!okay || mineCount == this.workingProbs.length) {
                dc.isAlive = true;
            }

        }

    }


    // find a list of locations which could be dead
    getCandidateDeadLocations() {

        // for each square on the edge
        for (let i = 0; i < this.witnessed.length; i++) {

            const tile = this.witnessed[i];

            const adjBoxes = this.getAdjacentBoxes(tile);

            if (adjBoxes == null) {  // this happens when the square isn't fully surrounded by boxes
                continue;
            }

            const dc = new DeadCandidate();
            dc.candidate = tile;
            dc.myBox = this.getBox(tile);

            for (let j = 0; j < adjBoxes.length; j++) {

                const box = adjBoxes[j];

                let good = true;
                for (let k = 0; k < box.tiles.length; k++) {

                    const square = box.tiles[k];

                    if (!square.isAdjacent(tile) && !(square.index == tile.index)) {
                        good = false;
                        break;
                    }
                }
                if (good) {
                    dc.goodBoxes.push(box);
                } else {
                    dc.badBoxes.push(box);
                }

            }

            if (dc.goodBoxes.length == 0 && dc.badBoxes.length == 0) {
                this.writeToConsole(dc.candidate.asText() + " is lonely since it has no open tiles around it");
                this.lonelyTiles.push(dc);
            } else {
                this.deadCandidates.push(dc);
            }


        }

        for (let i = 0; i < this.deadCandidates.length; i++) {
            const dc = this.deadCandidates[i];
            this.writeToConsole(dc.candidate.asText() + " is candidate dead with " + dc.goodBoxes.length + " good boxes and " + dc.badBoxes.length + " bad boxes");
        }

    }

    // get the box containing this tile
    getBox(tile) {

        for (let i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].contains(tile)) {
                return this.boxes[i];
            }
        }

        //this.writeToConsole("ERROR - tile " + tile.asText() + " doesn't belong to a box");

        return null;
    }

    // return all the boxes adjacent to this tile
    getAdjacentBoxes(loc) {

        const result = [];

        const adjLocs = this.board.getAdjacent(loc);

         // get each adjacent location
        for (let i = 0; i < adjLocs.length; i++) {

            let adjLoc = adjLocs[i];

            // we only want adjacent tile which are un-revealed
            if (!adjLoc.isCovered() || adjLoc.isSolverFoundBomb()) {
                continue;
            }

            // find the box it is in
            let boxFound = false;
            for (let j = 0; j < this.boxes.length; j++) {

                const box = this.boxes[j];

                if (box.contains(adjLoc)) {
                    boxFound = true;
                    // is the box already included?
                    let found = false;
                    for (let k = 0; k < result.length; k++) {

                        if (box.uid == result[k].uid) {
                            found = true;
                            break;
                        }
                    }
                    // if not add it
                    if (!found) {
                        result.push(box);
                        //sizeOfBoxes = box.getSquares().size();
                    }
                }
            }

            // if a box can't be found for the adjacent square then the location can't be dead
            if (!boxFound) {
                return null;
            }

        }

        return result;

    }

    // an edge is isolated if every tile on it is completely surrounded by boxes also on the same edge
    checkEdgeIsIsolated() {
        return false; // Optimization disabled: Missing WitnessWebIterator and Cruncher classes

        const edgeTiles = new Set();
        const edgeWitnesses = new Set();

        let everything = true;
        let allMines = true;

        // load each tile on this edge into a set
        for (let i = 0; i < this.mask.length; i++) {
            if (this.mask[i]) {
                //edgeTiles.add(...this.boxes[i].tiles);
                for (let j = 0; j < this.boxes[i].tiles.length; j++) {
                    edgeTiles.add(this.boxes[i].tiles[j]);
                }

                for (let j = 0; j < this.boxes[i].boxWitnesses.length; j++) {
                    edgeWitnesses.add(this.boxes[i].boxWitnesses[j].tile);
                }

            } else {
                everything = false;
            }
        }

        //var text = "";
        //for (var i = 0; i < edgeTiles.size; i++) {
        //    text = text + edgeTiles[i].asText() + " ";
        //}
        //console.log(text);

        // if this edge is everything then it isn't an isolated edge
        //if (everything) {
        //    this.writeToConsole("Not isolated because the edge is everything");
        //    return false;
        //}

        if (this.isolatedEdgeBruteForce != null && edgeTiles.size >= this.isolatedEdgeBruteForce.tiles.length) {
            this.writeToConsole("Already found an isolated edge of smaller size");
        }

        // check whether every tile adjacent to the tiles on the edge is itself on the edge
        for (let i = 0; i < this.mask.length; i++) {
            if (this.mask[i]) {
                for (let j = 0; j < this.boxes[i].tiles.length; j++) {
                    const tile = this.boxes[i].tiles[j];
                    const adjTiles = this.board.getAdjacent(tile);
                    for (let k = 0; k < adjTiles.length; k++) {
                        const adjTile = adjTiles[k];
                        if (adjTile.isCovered() && !adjTile.isSolverFoundBomb() && !edgeTiles.has(adjTile)) {
                            this.writeToConsole("Not isolated because a tile's adjacent tiles isn't on the edge: " + tile.asText() + " ==> " + adjTile.asText());
                            return false;
                        }
                    }
                }
            }
        }

        this.writeToConsole("*** Isolated Edge found ***");

        const tiles = [...edgeTiles];
        const witnesses = [...edgeWitnesses];
        const mines = this.workingProbs[0].mineCount;
        // build a web of the isolated edge and use it to build a brute force
        const isolatedEdge = new ProbabilityEngine(this.board, witnesses, tiles, tiles.length, mines, this.options);
        isolatedEdge.generateIndependentWitnesses();
        const iterator = new WitnessWebIterator(isolatedEdge, tiles, -1);

        const bruteForce = new Cruncher(this.board, iterator);

        this.isolatedEdgeBruteForce = bruteForce;

        return true;
    }

    // determine a set of independent witnesses which can be used to brute force the solution space more efficiently then a basic 'pick r from n'
    generateIndependentWitnesses() {

        this.remainingSquares = this.witnessed.length;

        // find a set of witnesses which don't share any squares (there can be many of these, but we just want one to use with the brute force iterator)
        for (let i = 0; i < this.prunedWitnesses.length; i++) {

            const w = this.prunedWitnesses[i];

            //console.log("Checking witness " + w.tile.asText() + " for independence");

            let okay = true;
            for (let j = 0; j < this.independentWitnesses.length; j++) {

                const iw = this.independentWitnesses[j];

                if (w.overlap(iw)) {
                    okay = false;
                    break;
                }
            }

            // split the witnesses into dependent ones and independent ones
            if (okay) {
                this.remainingSquares = this.remainingSquares - w.tiles.length;
                this.independentIterations = this.independentIterations * combination(w.minesToFind, w.tiles.length);
                this.independentMines = this.independentMines + w.minesToFind;
                this.independentWitnesses.push(w);
            } else {
                this.dependentWitnesses.push(w);
            }
        }

        this.writeToConsole("Calculated " + this.independentWitnesses.length + " independent witnesses");

    }

    // here we expand the localised solution to one across the whole board and
    // sum them together to create a definitive probability for each box
    calculateBoxProbabilities() {

        const tally = [];
        for (let i = 0; i < this.boxes.length; i++) {
            tally[i] = BigInt(0);
        }

        // total game tally
        let totalTally = BigInt(0);

        // outside a box tally
        let outsideTally = BigInt(0);

        //console.log("There are " + this.heldProbs.length + " different mine counts on the edge");

        // calculate how many mines
        for (let i = 0; i < this.heldProbs.length; i++) {

            const pl = this.heldProbs[i];

            //console.log("Mine count is " + pl.mineCount + " with solution count " + pl.solutionCount + " mineBoxCount = " + pl.mineBoxCount);

            if (pl.mineCount >= this.minTotalMines) {    // if the mine count for this solution is less than the minimum it can't be valid

                const mult = combination(this.minesLeft - pl.mineCount, this.TilesOffEdge);  //# of ways the rest of the board can be formed
                const newSolutions = mult * pl.solutionCount;

                this.writeToConsole(newSolutions + " solutions with " + pl.mineCount + " mines on Perimeter");

                outsideTally = outsideTally + mult * BigInt(this.minesLeft - pl.mineCount) * (pl.solutionCount);

                // this is all the possible ways the mines can be placed across the whole game
                totalTally = totalTally + newSolutions;

                for (let j = 0; j < tally.length; j++) {
                    //console.log("mineBoxCount " + j + " is " + pl.mineBoxCount[j]);
                    tally[j] = tally[j] + (mult * pl.mineBoxCount[j]) / BigInt(this.boxes[j].tiles.length);
                }
            }

        }

        this.minesFound = [];  // forget any mines we found on edges as we went along, we'll find them again here
        // for each box calculate a probability
        for (let i = 0; i < this.boxes.length; i++) {

            if (totalTally != 0) {
                if (tally[i] == totalTally) {  // a mine
                    //console.log("Box " + i + " contains mines");
                    this.boxProb[i] = 0;

                } else if (tally[i] == 0) {  // safe
                    this.boxProb[i] = 1;
                    this.emptyBoxes.push(this.boxes[i]);

                } else {  // neither mine nor safe
                    this.boxProb[i] = 1 - divideBigInt(tally[i], totalTally, 8);
                }

                this.boxes[i].mineTally = tally[i];
            } else {
                this.boxProb[i] = 0;
                this.boxes[i].mineTally = 0;

            }

            //console.log("Box " + i + " has probabality " + this.boxProb[i]);

            // for each tile in the box allocate a probability to it
            for (let j = 0; j < this.boxes[i].tiles.length; j++) {
                if (this.boxProb[i] == 0) {
                    this.minesFound.push(this.boxes[i].tiles[j]);
                }
            }

        }

        // see if the lonely tiles are dead
        for (let i = 0; i < this.lonelyTiles.length; i++) {
            const dc = this.lonelyTiles[i];
            //if (this.boxProb[dc.myBox.uid] != 0 && this.boxProb[dc.myBox.uid] != 1) {   // a lonely tile is dead if not a definite mine or safe
            if (this.boxProb[dc.myBox.uid] != 0) {
                this.writeToConsole("PE found Lonely tile " + dc.candidate.asText() + " is dead with value +" + dc.total);
                this.deadTiles.push(dc.candidate);
            }
        }

        // add the dead locations we found
        for (let i = 0; i < this.deadCandidates.length; i++) {
            const dc = this.deadCandidates[i];
            //if (!dc.isAlive && this.boxProb[dc.myBox.uid] != 0 && this.boxProb[dc.myBox.uid] != 1) {   // if it is dead and not a definite mine or safe
            if (!dc.isAlive && this.boxProb[dc.myBox.uid] != 0) {
                this.writeToConsole("PE found " + dc.candidate.asText() + " to be dead with value +" + dc.total);
                this.deadTiles.push(dc.candidate);
            }
        }

        // avoid divide by zero
        if (this.TilesOffEdge != 0 && totalTally != BigInt(0)) {
            this.offEdgeProbability = 1 - divideBigInt(outsideTally, totalTally * BigInt(this.TilesOffEdge), 8);
            this.offEdgeMineTally = outsideTally / BigInt(this.TilesOffEdge);
        } else {
            this.offEdgeProbability = 0;
            this.offEdgeMineTally = 0;
        }

        this.finalSolutionsCount = totalTally;


        // count how many clears we have
        this.localClears = [];
        if (totalTally > 0) {
            for (let i = 0; i < this.boxes.length; i++) {

                let box = this.boxes[i];

                if (tally[i] == 0) {
                    this.clearCount = this.clearCount + this.boxes[i].tiles.length;
                    this.localClears.push(...box.tiles);

                    // count how many of the clear tiles are also living
                    for (let j = 0; j < box.tiles.length; j++) {
                        let tile = box.tiles[j];

                        let tileLiving = true;
                        for (let k = 0; k < this.deadTiles.length; k++) {
                            if (this.deadTiles[k].isEqual(tile)) {
                                tileLiving = false;
                                break;
                            }
                        }
                        if (tileLiving) {
                            this.livingClearTile++;
                        }
                    }

                }
            }
        }

        // see if we can find a guess which is better than outside the boxes
        let hwm = 0;

        let bestSafety1 = this.offEdgeProbability;    // safest tile
        let bestSafety2 = this.offEdgeProbability;    // next safest tile
        let bestTile = null;

        for (let i = 0; i < this.boxes.length; i++) {

            const b = this.boxes[i];
            var prob = this.boxProb[b.uid];

            let boxLiving = false;

            // a box is dead if all its tiles are dead
            for (let j = 0; j < this.boxes[i].tiles.length; j++) {
                const tile = this.boxes[i].tiles[j];

                let tileLiving = true;
                for (let k = 0; k < this.deadTiles.length; k++) {
                    if (this.deadTiles[k].isEqual(tile)) {
                        tileLiving = false;
                        break;
                    }
                }
                if (tileLiving) {
                    boxLiving = true;

                    if (prob > bestSafety2) {
                        if (prob > bestSafety1) {
                            bestSafety2 = bestSafety1;
                            bestSafety1 = prob;
                            bestTile = tile;
                        } else {
                            bestSafety2 = prob;
                        }
                    }
                }
            }

            if (boxLiving || prob == 1) {   // if living or 100% safe then consider this probability
                if (hwm < prob) {
                     hwm = prob;
                }
            }
        }

        this.bestLivingSafety = bestSafety1;

        if (bestSafety1 > bestSafety2) {
            this.singleSafestTile = bestTile;
            //console.log("Safest next living tile is " + bestTile.asText());
        }

        // belended safety is a weighted average of the best and second best living safe tiles
        this.blendedSafety = (bestSafety1 * 4 + bestSafety2) / 5;
        //this.blendedSafety = bestSafety1;


        this.bestOnEdgeProbability = hwm;

        this.bestProbability = Math.max(this.bestOnEdgeProbability, this.offEdgeProbability);            ;

        this.writeToConsole("Safe tiles " + this.localClears.length + ", Mines found " + this.minesFound.length);
        this.writeToConsole("Off edge Safety is " + this.offEdgeProbability);
        this.writeToConsole("Best on edge safety is " + this.bestOnEdgeProbability);
        this.writeToConsole("Best safety is " + this.bestProbability);
        this.writeToConsole("Best living safety is " + this.bestLivingSafety);
        this.writeToConsole("Blended safety is " + this.blendedSafety);
        this.writeToConsole("Game has  " + this.finalSolutionsCount + " candidate solutions" );

        this.fullAnalysis = true;

    }

    getBestCandidates(freshhold) {

        var best = [];

        //solver.display("Squares left " + this.squaresLeft + " squares analysed " + web.getSquares().size());

        // if the outside probability is the best then return an empty list
        let test;
        if (this.bestProbability == 1) {  // if we have a probability of one then don't allow lesser probs to get a look in
            test = this.bestProbability;
        } else {
            test = this.bestProbability * freshhold;
        }

        this.writeToConsole("Best probability is " + this.bestProbability + " freshhold is " + test);

        for (let i = 0; i < this.boxProb.length; i++) {
            if (this.boxProb[i] >= test) {
                for (let j = 0; j < this.boxes[i].tiles.length; j++) {
                    const squ = this.boxes[i].tiles[j];

                    //  exclude dead tiles
                    let dead = false;
                    for (let k = 0; k < this.deadTiles.length; k++) {
                        if (this.deadTiles[k].isEqual(squ)) {
                            dead = true;
                            break;
                        }
                    }
                    if (!dead || this.boxProb[i] == 1) {   // if not dead or 100% safe then use the tile
                        best.push(new Action(squ.x, squ.y, this.boxProb[i], ACTION_CLEAR));
                    } else {
                        this.writeToConsole("Tile " + squ.asText() + " is ignored because it is dead");
                    }

                }
            }
        }

        // sort in to best order
        best.sort(function (a, b) { return b.prob - a.prob });

        return best;

    }

    // returns an array of 'Tile' which are dead
    getDeadTiles() {

         return this.deadTiles;
    }

    getProbability(l) {

        for (const b of this.boxes) {
            if (b.contains(l)) {
                return this.boxProb[b.uid];
            }
        }

        return this.offEdgeProbability;
    }

    getFiftyPercenters() {

        const picks = [];

        for (let i = 0; i < this.boxProb.length; i++) {
            if (this.boxProb[i] == 0.5) {
                picks.push(...this.boxes[i].tiles);
            }
        }

        return picks;

    }


    // forces a box to contain a tile which isn't a mine.  If the location isn't in a box false is returned.
     setMustBeEmpty(tile) {

        const box = this.getBox(tile);

        if (box == null) {
            this.validWeb = false;
            return false;
        } else {
            box.incrementEmptyTiles();
        }

        return true;

    }

    writeToConsole(text, always) {

        if (always == null) {
            always = false;
        }

        if (this.verbose || always) {
            console.log(text);
        }

    }

}

/**
 * Utility class for sorting probability lines during compression
 * This enables efficient merging of probability lines with identical mine distributions
 */
class MergeSorter {

    constructor(boxes) {

        if (boxes == null) {
            this.checks = [];
            return;
        }

        // Store the unique identifiers of boxes to use for comparison
        this.checks = Array(boxes.length);

        for (let i = 0; i < boxes.length; i++) {
            this.checks[i] = boxes[i].uid;
        }

    }

    /**
     * Compares two probability lines for sorting
     * First by total mine count, then by individual box allocations
     * @param {ProbabilityLine} p1 - First probability line
     * @param {ProbabilityLine} p2 - Second probability line
     * @returns {number} Comparison result (-1, 0, or 1)
     */
    compare(p1, p2) {

        // Primary sort: by total mine count
        let c = p1.mineCount - p2.mineCount;

        if (c != 0) {
            return c;
        }

        // Secondary sort: by mine allocation in each checked box
        for (let i = 0; i < this.checks.length; i++) {
            const index = this.checks[i];

            c = p1.allocatedMines[index] - p2.allocatedMines[index];

            if (c != 0) {
                return c;
            }

        }

        return 0;  // Probability lines are identical
    }

}

/**
 * ProbabilityLine represents a single configuration of mine placements across all boxes
 * Each probability line corresponds to a way mines could be distributed that satisfies
 * all witness constraints. The solution count indicates how many concrete tile arrangements
 * this line represents (accounting for different ways mines can be placed within boxes).
 */
class ProbabilityLine {

    /**
     * Constructor for a probability line
     * @param {number} boxCount - Number of boxes in the constraint system
     * @param {BigInt} solutionCount - Number of concrete arrangements this line represents
     */
	constructor(boxCount, solutionCount) {

        this.mineCount = 0;  // Total mines in this configuration
        if (solutionCount == null) {
            this.solutionCount = BigInt(0);
        } else {
            this.solutionCount = solutionCount;  // Number of ways to achieve this configuration
        }

        // mineBoxCount[i] = total mine probability mass in box i (weighted by solutionCount)
        this.mineBoxCount = Array(boxCount).fill(BigInt(0));
        // allocatedMines[i] = number of mines definitely placed in box i for this configuration
        this.allocatedMines = Array(boxCount).fill(0);

    }

}

/**
 * NextWitness represents a witness to be processed next in the constraint satisfaction
 * It tracks which boxes are already processed (oldBoxes) versus newly encountered (newBoxes)
 */
class NextWitness {
    constructor(boxWitness) {

        this.boxWitness = boxWitness;

        // Boxes already processed in previous iterations
        this.oldBoxes = [];
        // Boxes being encountered for the first time with this witness
        this.newBoxes = [];

        // Categorize each box associated with this witness
        for (let i = 0; i < this.boxWitness.boxes.length; i++) {

            const box = this.boxWitness.boxes[i];
            if (box.processed) {
                this.oldBoxes.push(box);  // Already have probability distributions for this box
            } else {
                this.newBoxes.push(box);  // Need to generate probability distributions
            }
        }
    }

}



/**
 * BoxWitness represents a revealed tile with a number that creates constraints
 * It tracks all unrevealed tiles adjacent to it and calculates how many mines still need to be found
 */
class BoxWitness {

    /**
     * Constructor for BoxWitness
     * @param {Board} board - The game board
     * @param {Tile} tile - The revealed witness tile with a number
     */
	constructor(board, tile) {

        this.tile = tile;

        this.boxes = [];  // adjacent boxes (groups of tiles with same constraints)
        this.tiles = [];  // adjacent unrevealed tiles

        this.processed = false;  // whether this witness has been processed yet
        this.minesToFind = tile.getValue();   // number of mines this witness needs to account for

        const adjTile = board.getAdjacent(tile);

        // Calculate remaining mines to find and collect adjacent unrevealed tiles
        for (let i = 0; i < adjTile.length; i++) {
            if (adjTile[i].isSolverFoundBomb()) {
                this.minesToFind--;  // Already found a mine here, so one less to find
            } else if (adjTile[i].isCovered()) {
                this.tiles.push(adjTile[i]);  // Unrevealed tile that could contain a mine
            }
        }
 	}

    /**
     * Checks if this witness shares any tiles with another witness
     * @param {BoxWitness} boxWitness - Another witness to check for overlap
     * @returns {boolean} True if witnesses share at least one tile
     */
    overlap(boxWitness) {

        // Quick distance check - if witnesses are too far apart they can't share tiles
        if (Math.abs(boxWitness.tile.x - this.tile.x) > 2 || Math.abs(boxWitness.tile.y - this.tile.y) > 2) {
            return false;
        }

        // Check for any shared tiles
        top: for (let i = 0; i < boxWitness.tiles.length; i++) {

            const tile1 = boxWitness.tiles[i];

            for (let j = 0; j < this.tiles.length; j++) {

                const tile2 = this.tiles[j];

                if (tile1.isEqual(tile2)) {  // Found a shared tile
                    return true;
                }
            }
        }

        // No shared tiles found
        return false;

    }


    /**
     * Checks if two witnesses are equivalent (monitor exactly the same set of tiles)
     * Equivalent witnesses can be pruned to improve performance
     * @param {BoxWitness} boxWitness - Another witness to compare with
     * @returns {boolean} True if witnesses monitor identical tile sets
     */
    equivalent(boxWitness) {

        // Different number of tiles means they can't be equivalent
        if (this.tiles.length != boxWitness.tiles.length) {
            return false;
        }

        // Distance check for quick elimination
        if (Math.abs(boxWitness.tile.x - this.tile.x) > 2 || Math.abs(boxWitness.tile.y - this.tile.y) > 2) {
            return false;
        }

        // Check that every tile in this witness is also in the other witness
        for (let i = 0; i < this.tiles.length; i++) {

            const l1 = this.tiles[i];

            let found = false;
            for (let j = 0; j < boxWitness.tiles.length; j++) {
                if (boxWitness.tiles[j].index == l1.index) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;  // This tile is not in the other witness
            }
        }

        return true;  // All tiles match
    }

    /**
     * Adds a box to this witness's list of adjacent boxes
     * @param {Box} box - The box to add
     */
    addBox(box) {
        this.boxes.push(box);
    }
}

// information about the boxes surrounding a dead candidate
class DeadCandidate {

    constructor() {

        this.candidate;
        this.myBox;
        this.isAlive = false;
        this.goodBoxes = [];
        this.badBoxes = [];

        this.firstCheck = true;
        this.total = 0;

    }

}

/**
 * Box represents a group of tiles that share identical witness constraints
 * This is a key optimization - tiles with the same set of adjacent witnesses
 * can be treated as equivalent in probability calculations
 */
class Box {

    /**
     * Constructor for Box
     * @param {Array} boxWitnesses - All witness objects in the system
     * @param {Tile} tile - The first tile to be added to this box
     * @param {number} uid - Unique identifier for this box
     */
	constructor(boxWitnesses, tile, uid) {

        this.processed = false;  // Whether this box has been processed in probability calculations

		this.uid = uid;          // Unique identifier for this box
        this.minMines;           // Minimum possible mines in this box
        this.maxMines;           // Maximum possible mines in this box

        this.tiles = [tile];     // All tiles belonging to this box

        // Number of tiles in the box that are known to be empty (not mines)
        // This is used for constraint refinement
        this.emptyTiles = 0;

        // All witnesses (revealed numbered tiles) adjacent to tiles in this box
		this.boxWitnesses = [];

        // Used for probability calculations - total "mine weight" for this box
        this.mineTally = BigInt(0);

        // Find all witnesses that are adjacent to our starting tile
		for (let i=0; i < boxWitnesses.length; i++) {
			if (tile.isAdjacent(boxWitnesses[i].tile)) {
                this.boxWitnesses.push(boxWitnesses[i]);
                boxWitnesses[i].addBox(this);  // Tell the witness about this box

			}
		}

		//console.log("Box created for tile " + tile.asText() + " with " + this.boxWitnesses.length + " witnesses");

	}

    /**
     * Checks if a tile belongs to this box by verifying it has the same witness constraints
     * @param {Tile} tile - The tile to check
     * @param {number} count - Number of witnesses adjacent to the tile
     * @returns {boolean} True if the tile fits in this box
     */
	fits(tile, count) {

		// A tile can only join this box if it has the same number of adjacent witnesses
		if (count != this.boxWitnesses.length) {
			return false;
		}

        // Verify that the tile is adjacent to all the same witnesses as existing tiles in this box
		for (let i=0; i < this.boxWitnesses.length; i++) {
			if (!this.boxWitnesses[i].tile.isAdjacent(tile)) {
				return false;
			}
		}

		//console.log("Tile " + tile.asText() + " fits in box with tile " + this.tiles[0].asText());

		return true;

	}

    /**
     * Calculates the minimum and maximum possible mines for this box
     * based on witness constraints and remaining mines in the game
     * @param {number} minesLeft - Total mines remaining to be placed
     */
    calculate(minesLeft) {

        // Can't have more mines than tiles available or total mines remaining
        this.maxMines = Math.min(this.tiles.length, minesLeft);
        this.minMines = 0;

        // Apply constraints from adjacent witnesses
        for (let i = 0; i < this.boxWitnesses.length; i++) {
            // Can't exceed what any witness requires
            if (this.boxWitnesses[i].minesToFind < this.maxMines) {
                this.maxMines = this.boxWitnesses[i].minesToFind;
            }
            // If a witness has this as its only box, all its mines must be here
            if (this.boxWitnesses[i].boxes.length == 1) {
                this.minMines = this.boxWitnesses[i].minesToFind;
            }
        }

    }

    /**
     * Increments the count of tiles known to be empty (not mines)
     * This reduces the effective size of the box for mine placement
     */
    incrementEmptyTiles() {

        this.emptyTiles++;
        // Reduce max mines if we have fewer available spaces
        if (this.maxMines > this.tiles.length - this.emptyTiles) {
            this.maxMines = this.tiles.length - this.emptyTiles;
        }

    }

    /**
     * Adds a new tile to this box
     * @param {Tile} tile - The tile to add
     */
	add(tile) {
		this.tiles.push(tile);
	}

    /**
     * Checks if this box contains a specific tile
     * @param {Tile} tile - The tile to search for
     * @returns {boolean} True if the tile is in this box
     */
    contains(tile) {

        // Search for the tile by index
        for (let i = 0; i < this.tiles.length; i++) {
            if (this.tiles[i].index == tile.index) {
                return true;
            }
        }

        return false;

    }

}

// Links which when joined together might form a 50/50 chain
class Link {

    constructor() {

        this.witness = null;

        this.tile1 = null;
        this.closed1 = true;
        this.dead1 = false;

        this.tile2 = null;
        this.closed2 = true;
        this.dead2 = false;

        this.processed = false;
        this.pseudo = false;
        this.unavoidable = true;

        this.breaker = [];

        Object.seal(this); // prevent new values being created
    }

}

// A series of links which might form a 50/50
class Chain {

    constructor() {

        this.whole5050 = [];
        this.living5050 = [];
        this.pseudoTiles = [];

        this.openTile = null;
        this.openTile2 = null;

        this.secondPass = false;
        this.pseudo = false;

        this.breaker = [];

        Object.seal(this); // prevent new values being created
    }

}


const power10n = [BigInt(1), BigInt(10), BigInt(100), BigInt(1000), BigInt(10000), BigInt(100000), BigInt(1000000), BigInt(10000000), BigInt(100000000), BigInt(1000000000)];
const power10 = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000];

function divideBigInt(numerator, denominator, dp) {
    const work = numerator * power10n[dp] / denominator;
    const result = Number(work) / power10[dp];
    return result;
}

const binomialEngine = new Binomial(5000, 500);
const binomialCache = new BinomialCache(1000, 200, binomialEngine);

function combination(mines, squares) {
    return binomialCache.getBinomial(mines, squares);
}

export const ACTION_FLAG = 0;
export const ACTION_CLEAR = 1;

export const PLAY_STYLE_FLAGS = 1;
export const PLAY_STYLE_NOFLAGS = 2;
export const PLAY_STYLE_EFFICIENCY = 3;
export const PLAY_STYLE_NOFLAGS_EFFICIENCY = 4;

export class Action {
    constructor(x, y, prob, action) {
        this.x = x;
        this.y = y;
        this.prob = prob;
        this.action = action;
    }
}

export { ProbabilityEngine };
