import { useMoralis, useWeb3Contract } from "react-moralis"
import { qiteAddresses, qiteDexAbi } from "@/contracts/qite-dex-constant"
import CreateModal from "./CreateModal"
import { useState } from "react"

export default function LiquidityPools() {
    const { chainID: chainIdHex, isWeb3Enabled, account } = useMoralis()
    const qiteContractAddress = "0x956DC5D405D520E0bC9e662307435D655e9Da441"

    const [isModalOpen, setIsModalOpen] = useState(false)

    const { runContractFunction: createLiquidityPool } = useWeb3Contract({
        abi: qiteDexAbi,
        contractAddress: qiteContractAddress,
        functionName: "createPairs",
    })

    const handleConfirmModal = async (
        token1,
        token2,
        token1Name,
        token2Name
    ) => {
        try {
            console.log("Create liquidity pool for", token1, token2)
            await createLiquidityPool({
                params: {
                    params: {
                        token1: token1,
                        token2: token2,
                        token1Name: token1Name,
                        token2Name: token2Name,
                    },
                },
                onSuccess: (tx) => {
                    console.log("Liqruidity pool created successfully", tx)
                },
                onError: (err) => {
                    console.log(err)
                },
            })
            setIsModalOpen(false)
        } catch (e) {
            console.log("Error when creating liqudity", e)
        }
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
    }

    return (
        <div className="mt-8 p-8 bg-white rounded-lg shadow-md max-w-lg mx-auto">
            <h2 className="text-2xl font-bold">Liquidity Pools</h2>
            {isWeb3Enabled && qiteContractAddress != null ? (
                <div>
                    <p className="mb-4">Welcome, {account}!</p>
                    <button
                        className="bg-green-500 text-white py-1 px-4 rounded-md hover:bg-green-600"
                        onClick={(e) => {
                            setIsModalOpen(true)
                        }}
                    >
                        Create Liquidity Pool
                    </button>
                    <CreateModal
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        onConfirm={handleConfirmModal}
                    />
                </div>
            ) : (
                <div>Please Log In!</div>
            )}
        </div>
    )
}
