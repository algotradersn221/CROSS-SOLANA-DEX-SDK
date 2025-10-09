import fetch from "node-fetch";
import 'dotenv/config';
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getMint } from "@solana/spl-token";
import { sleep } from "./dextools.js";
//import { obtenirCotationPumpSwap } from "./pumpswap.js";
import BN from "bn.js";
export type PoolInfos = {
    pubkey: string;
    pool_address: string;
    base_mint: string;
    quote_mint: string;
    lp_mint: string;
    lp_supply: number;
    pool_base_token_account: string;
    pool_quote_token_account: string;
    creator: string;
    pool_bump: number;
    index: number;
    baseReserve?: number;
    quoteReserve?: number;
};
const url = process.env.SHYFT_RPC || "api.mainnet-solana.com";
const url2 = process.env.RPC_URL || "api.mainnet-solana.com";
const connection = new Connection(url);
const connection2 = new Connection(url2);

async function getPoolAddressFromReserves(reserveX: string) {
    const account = await getAccount(connection, new PublicKey(reserveX));
    return account.owner.toBase58();
}
export async function pummpswapPools(mintAddress: string, min_reserves_quotes: number, min_pool_count: number): Promise<PoolInfos[]> {
    const SHYFT_API_KEY = process.env.SHYFT_KEY;
    if (!SHYFT_API_KEY) throw new Error("⛔ Clé SHYFT_KEY non définie dans .env");
    const query = `
    query GetPools {
      pump_fun_amm_Pool(
        where: { base_mint: { _eq: ${JSON.stringify(mintAddress)} } }
      ) {
        pubkey
        base_mint
        quote_mint
        lp_mint
        lp_supply
        pool_base_token_account
        pool_quote_token_account
        creator
        pool_bump
        index
      }
    }
  `;

    try {


        const response = await fetch(
            `https://programs.shyft.to/v0/graphql/accounts?api_key=${SHYFT_API_KEY}&network=mainnet-beta`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: {}, operationName: "GetPools" }),
            }
        );

        const { data, errors } = (await response.json()) as { data?: any; errors?: any };
        if (errors) {
            console.log("Erreur GraphQL :", errors);
            return [];
        }
        const filtredPool: PoolInfos[] = [];
        const pools: PoolInfos[] = data?.pump_fun_amm_Pool ?? [];
        let count = 0;
        let lot = min_reserves_quotes;
        for (const pool of pools) {
            try {

                // 🔹 Lecture des comptes SPL
                const baseAccount = await getAccount(connection, new PublicKey(pool.pool_base_token_account));
                const quoteAccount = await getAccount(connection, new PublicKey(pool.pool_quote_token_account));
                await sleep(500);
                // 🔹 Lecture des mint pour connaître les décimales
                const baseMintInfo = await getMint(connection, new PublicKey(pool.base_mint));
                const quoteMintInfo = await getMint(connection, new PublicKey(pool.quote_mint));

                const baseReserve = Number(baseAccount.amount) / (10 ** baseMintInfo.decimals);
                const quoteReserve = Number(quoteAccount.amount) / (10 ** quoteMintInfo.decimals);
                if (quoteMintInfo.decimals <= 6)
                    lot = min_reserves_quotes * 100;

                if (baseReserve > 0 && quoteReserve >= lot) {
                    pool.pool_address = pool.pubkey;
                    pool.baseReserve = baseReserve;
                    pool.quoteReserve = quoteReserve;
                    filtredPool.push(pool);
                    count++;
                    if (count >= min_pool_count)
                        break;
                }
            } catch (err) {
                console.error(`⚠️ Erreur récupération réserves pour pool ${pool.pool_address}:`, err);
                pool.baseReserve = 0;
                pool.quoteReserve = 0;
            }
        }

        return filtredPool;

        // return poolpump;
    } catch (err: any) {
        console.error("Erreur lors de la requête Shyft :", err.message);
        return [];
    }
}

type PoolInfosMeteora = {
    pool_address: string; // ici on met le compte SPL de la base comme identifiant du pool
    base_mint: string;
    quote_mint: string;
    pool_base_token_account: string;
    pool_quote_token_account: string;
    creator_oracle: string;
    baseReserve?: number;
    quoteReserve?: number;
};


export async function meteoraPools(
    mintAddress: string,
    min_reserves_quotes: number,
    min_pool_count: number
): Promise<PoolInfos[]> {
    const SHYFT_API_KEY = process.env.SHYFT_KEY;
    if (!SHYFT_API_KEY) throw new Error("⛔ Clé SHYFT_KEY non définie dans .env");

    const query = `
    query GetLBPairs {
      meteora_dlmm_LbPair(
        where: { _or: [
          { tokenXMint: { _eq: ${JSON.stringify(mintAddress)} } },
          { tokenYMint: { _eq: ${JSON.stringify(mintAddress)} } }
        ] }
      ) {
        reserveX
        reserveY
        tokenXMint
        tokenYMint
        baseKey
        pairType
        oracle
        lastUpdatedAt
        _lamports
      }
    }`;
    let min_res = min_reserves_quotes;
    try {
        const response = await fetch(
            `https://programs.shyft.to/v0/graphql/accounts?api_key=${SHYFT_API_KEY}&network=mainnet-beta`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: {}, operationName: "GetLBPairs" }),
            }
        );

        const { data, errors } = (await response.json()) as { data?: any; errors?: any };
        if (errors) {
            console.error("Erreur GraphQL Meteora :", errors);
            return [];
        }
        // console.log(data);
        //return [];
        const filtredPool: PoolInfos[] = [];
        const pools = data?.meteora_dlmm_LbPair ?? [];
        let count = 0;

        for (const pool of pools) {
            try {
                // 🔹 Identifier quel token est la base
                let baseMint = "";
                let quoteMint = "";
                let baseReserveAcc = "";
                let quoteReserveAcc = "";

                if (pool.tokenXMint === mintAddress) {
                    baseMint = pool.tokenXMint;
                    quoteMint = pool.tokenYMint;
                    baseReserveAcc = pool.reserveX;
                    quoteReserveAcc = pool.reserveY;
                } else {
                    baseMint = pool.tokenYMint;
                    quoteMint = pool.tokenXMint;
                    baseReserveAcc = pool.reserveY;
                    quoteReserveAcc = pool.reserveX;
                }

                // 🔹 Lecture des comptes SPL
                const baseAccount = await getAccount(connection, new PublicKey(baseReserveAcc));
                const quoteAccount = await getAccount(connection2, new PublicKey(quoteReserveAcc));
                await sleep(500);

                // 🔹 Lecture des mint pour les décimales
                const baseMintInfo = await getMint(connection, new PublicKey(baseMint));
                const quoteMintInfo = await getMint(connection2, new PublicKey(quoteMint));

                const baseReserve = Number(baseAccount.amount) / (10 ** baseMintInfo.decimals);
                const quoteReserve = Number(quoteAccount.amount) / (10 ** quoteMintInfo.decimals);
                const addresse = await getPoolAddressFromReserves(quoteReserveAcc);
                if (!addresse) continue;
                if (quoteMintInfo.decimals <= 6)
                    min_res = min_reserves_quotes * 100;

                if (baseReserve > 0 && quoteReserve >= min_res) {
                    const poolInfo: PoolInfos = {
                        pubkey: "",
                        pool_address: addresse, // utiliser le compte SPL de base comme "adresse" du pool
                        base_mint: baseMint,
                        quote_mint: quoteMint,
                        lp_mint: "",
                        lp_supply: 0,
                        pool_base_token_account: baseReserveAcc,
                        pool_quote_token_account: quoteReserveAcc,
                        creator: pool.oracle,
                        pool_bump: 0,
                        index: 0,
                        baseReserve,
                        quoteReserve
                    };
                    filtredPool.push(poolInfo);
                    count++;
                    if (count >= min_pool_count) break;
                }
            } catch (err) {
                console.error(`⚠️ Erreur récupération réserves pour Meteora pool ${pool.baseKey}:`, err);
            }
        }

        return filtredPool;

    } catch (err: any) {
        console.error("Erreur lors de la requête Shyft Meteora :", err.message);
        return [];
    }
}

/*
// Exemple d’utilisation
(async () => {

    const token = "Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk";
    const pools = await pummpswapPools(
        token, 1, 10
    );

    console.log(`✅ ${pools.length} Meteora pool(s) trouvé(s) où le token est base :\n`);

    for (const pool of pools) {
        console.log("──────────────────────────────");
        console.log(`Pool address (base account): ${pool.pool_address}`);
        console.log(`Base mint: ${pool.base_mint}`);
        console.log(`Quote mint: ${pool.quote_mint}`);
        console.log(`Base account: ${pool.pool_base_token_account}`);
        console.log(`Quote account: ${pool.pool_quote_token_account}`);
        console.log(`Creator/Oracle: ${pool.creator}`);
        console.log(`Base reserve: ${pool.baseReserve}`);
        console.log(`Quote reserve: ${pool.quoteReserve}`);
    }
})();


const pools = await pummpswapPools(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 3, 3
);

console.log(`✅ ${pools.length} pool(s) trouvé(s) où le token est base :\n`);
(async () => {
    for (const pool of pools) {
        //console.log(pool);
        await obtenirCotationPumpSwap(pool, new BN(1000), "buy", 50);
        //break;
        
        console.log("──────────────────────────────");
        console.log(`Adress: ${pool.pool_address}`);
        console.log(`Base mint: ${pool.base_mint}`);
        console.log(`Quote mint: ${pool.quote_mint}`);
        console.log(`LP mint: ${pool.lp_mint}`);
        console.log(`LP supply: ${pool.lp_supply}`);
        console.log(`Creator: ${pool.creator}`);
        console.log(`Base reserve: ${pool.baseReserve}`);
        console.log(`Quote reserve: ${pool.quoteReserve}`);

    }

})();

*/