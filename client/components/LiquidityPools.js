import { useMoralis, useWeb3Contract } from "react-moralis"
import { qiteAddresses, qiteDexAbi } from "@/contracts/qite-dex-constant"

export default function LiquidityPools() {
    const { chainID: chainIDHex, isWeb3Enabled, account } = useMoralis()
    const qiteContractAddress =
        chainIDHex in qiteAddresses ? qiteAddresses[chainIDHex].qiteSwap : null

    const { runContractFunction: createLiquidityPool } = useWeb3Contract({
        abi: qiteDexAbi,
        contractAddress: qiteContractAddress,
        functionName: "createPairs",
    })

    return (
        <div className="mt-8 p-8 bg-white rounded-lg shadow-md max-w-lg mx-auto">
            <h2 className="text-2xl font-bold">Liquidity Pools</h2>
            {isWeb3Enabled && qiteContractAddress == null ? (
                <div></div>
            ) : (
                <div>Please Log In!</div>
            )}
        </div>
    )
}
