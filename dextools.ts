// ------------------------------------
// Imports
// ------------------------------------
import { readFileSync, access, constants, promises as fs } from "fs";
import path from "path";
import fetch from "node-fetch";
import 'dotenv/config';
import { fileURLToPath } from "url";
import { Connection, PublicKey } from "@solana/web3.js";

// Récupération du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fichiers locaux
const TOKEN_JSON_PATH = path.join(__dirname, "token.json");
const NEWPOOLS_JSON_PATH = path.resolve("./newpools.json");
const DECIMALS_FILE = path.resolve("./decimals.json");

// Connexion Solana
const connection = new Connection("https://api.mainnet-beta.solana.com");

// ------------------------------------
// Types
// ------------------------------------
export interface TokenData { tokenAddress: string; }
export interface PoolData {
    pairAddress: string;
    baseSymbol: string;
    baseAddress: string;
    quoteSymbol: string;
    quoteAddress: string;
}
export interface PoolsObj {
    token: string;
    [dex: string]: PoolData[] | string;
}
export interface PoolDatas {
    pairAddress: string;
    baseToken: { symbol: string; address: string };
    quoteToken: { symbol: string; address: string };
    dexId: string;
    liquidity?: { usd: number };
    priceUsd?: number;
    [key: string]: any;
}

// ------------------------------------
// Utilitaires
// ------------------------------------
/** Pause de X millisecondes */
export async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function sleep(ms: number): Promise<void> {
    return delay(ms);
}

// ------------------------------------
// Récupération des tokens
// ------------------------------------
export async function getProfileTokens(): Promise<string[]> {
    try {
        const res = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        const data = (await res.json()) as TokenData[];
        return data.map(item => item.tokenAddress);
    } catch (err) {
        console.error("Erreur getProfileTokens:", err);
        return [];
    }
}

export async function getBoostedTokens(): Promise<string[]> {
    try {
        const res = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        const data = (await res.json()) as TokenData[];
        return data.map(item => item.tokenAddress);
    } catch (err) {
        console.error("Erreur getBoostedTokens:", err);
        return [];
    }
}

/** Récupère tous les tokens uniques (profil + boosts) et sauvegarde dans token.json */
export async function getAllUniqueTokens(): Promise<string[]> {
    try {
        const profiles = await getProfileTokens();
        const boosts = await getBoostedTokens();
        const combined = [...new Set([...profiles, ...boosts])];

        try { await fs.access(TOKEN_JSON_PATH); } 
        catch { await fs.writeFile(TOKEN_JSON_PATH, "[]", "utf-8"); }

        await fs.writeFile(TOKEN_JSON_PATH, JSON.stringify(combined, null, 2), "utf-8");
        return combined;
    } catch (err) {
        console.error("Erreur getAllUniqueTokens:", err);
        try {
            const data = await fs.readFile(TOKEN_JSON_PATH, "utf-8");
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
}

export async function getTokensFromFile(): Promise<string[]> {
    try {
        await fs.access(TOKEN_JSON_PATH).catch(async () => await fs.writeFile(TOKEN_JSON_PATH, "[]", "utf-8"));
        const data = await fs.readFile(TOKEN_JSON_PATH, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Impossible de lire token.json :", err);
        return [];
    }
}

// ------------------------------------
// Récupération des pools
// ------------------------------------
export async function getPoolsForTokens(
    tokenAddresses: string[],
    chainId: string,
    dexIds: string[],
    delayMs: number
): Promise<PoolsObj[] | null> {
    const results: PoolsObj[] = [];

    for (const token of tokenAddresses) {
        try {
            const url = `https://api.dexscreener.com/token-pairs/v1/${chainId}/${token}`;
            const res = await fetch(url);
            if (!res.ok) { console.warn(`Erreur HTTP pour ${token}: ${res.status}`); continue; }

            const data = (await res.json()) as any[];
            await delay(delayMs);

            const filtered = data.filter(item => {
                if (!dexIds.includes(item.dexId)) return false;
                if (!item.liquidity || item.liquidity.usd < 0) return false;
                if (item.dexId === "meteora") return item.labels?.includes("DLMM");
                return true;
            });

            if (filtered.length === 0) continue;
            const poolsObj: PoolsObj = { token };
            dexIds.forEach(dex => {
                const dexPools = filtered.filter(p => p.dexId === dex);
                poolsObj[dex] = dexPools.map(pool => ({
                    pairAddress: pool.pairAddress,
                    baseSymbol: pool.baseToken.symbol,
                    baseAddress: pool.baseToken.address,
                    quoteSymbol: pool.quoteToken.symbol,
                    quoteAddress: pool.quoteToken.address,
                }));
            });

            results.push(poolsObj);
        } catch (err) {
            console.error(`Erreur getPoolsForTokens pour ${token}:`, err);
            return null;
        }
    }

    return results;
}

/** Récupère tous les pools pour un token avec filtrage par DEX et liquidité minimale */
export async function fetchAllPools(
    tokens: string[],
    dexIds: string[],
    minUsdLiquidity: number = 0,
    delayMs: number = 1000,
    chain: string = "solana"
): Promise<[string, PoolDatas[]][]> {
    const poolResults: [string, PoolDatas[]][] = [];
    for (const token of tokens) {
        const result = await AllPools(token, dexIds, minUsdLiquidity, chain);
        poolResults.push(result);
        await sleep(delayMs);
    }
    return poolResults;
}

/** Filtre les pools où le token est le baseToken */
export function getPoolsWhereTokenIsBase(
    poolsData: [string, PoolDatas[]][],
    tokenAddress: string,
    dexIds: string[] = []
): PoolDatas[] {
    const result: PoolDatas[] = [];
    for (const [token, pools] of poolsData) {
        if (token.toLowerCase() !== tokenAddress.toLowerCase()) continue;
        const filteredPools = pools.filter(
            pool => dexIds.includes(pool.dexId) && pool.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase()
        );
        result.push(...filteredPools);
    }
    return result;
}

// ------------------------------------
// Gestion des décimales
// ------------------------------------
async function readDecimalsFile(): Promise<Record<string, number>> {
    try {
        const content = await fs.readFile(DECIMALS_FILE, "utf8");
        return JSON.parse(content);
    } catch (err: any) {
        if (err.code === "ENOENT") return {};
        throw err;
    }
}

async function saveDecimalsFile(data: Record<string, number>) {
    await fs.writeFile(DECIMALS_FILE, JSON.stringify(data, null, 4), "utf8");
}

/** Récupère le nombre de décimales d’un token */
export async function getDecimals(token: string): Promise<number> {
    const decimalsData = await readDecimalsFile();
    if (decimalsData[token] !== undefined) return decimalsData[token];

    const tokenMint = new PublicKey(token);
    const mintInfo = await connection.getParsedAccountInfo(tokenMint);
    if (!mintInfo.value) throw new Error("Mint non trouvé");

    const decimals = (mintInfo.value.data as any).parsed.info.decimals;
    decimalsData[token] = decimals;
    await saveDecimalsFile(decimalsData);

    return decimals;
}

// ------------------------------------
// Gestion fichiers signal et nouveaux pools
// ------------------------------------
export function lireSignal(path: string, separator = ":"): string[] {
    const content = readFileSync(path, "utf-8");
    return content.split(/\r?\n/)[0].split(separator).map(s => s.trim());
}

export async function writeSignal(path: string, line: string): Promise<void> {
    const data = line.endsWith("\n") ? line : line + "\n";
    await fs.appendFile(path, data, "utf8").catch(err => console.error(`Impossible d'écrire ${path}:`, err));
}

export async function addHashToFile(path: string): Promise<void> {
    try {
        let data = '';
        try { await fs.access(path, constants.F_OK); data = await fs.readFile(path, 'utf-8'); } catch {}
        const lines = data.split(/\r?\n/).map(line => line ? '#' + line : '');
        await fs.writeFile(path, lines.join('\n'), 'utf-8');
    } catch (err) { console.error('Erreur addHashToFile:', err); }
}
