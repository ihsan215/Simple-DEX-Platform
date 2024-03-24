import { useMoralis, useWeb3Contract } from "react-moralis"
import {
    qiteAddresses,
    qiteDexAbi,
    qitePool,
    qitePoolToken,
} from "@/contracts/qite-dex-constant"
import CreateModal from "./CreateModal"
import { useEffect, useState } from "react"
import { ethers } from "ethers"

export default function LiquidityPools() {
    const { chainID: chainIdHex, isWeb3Enabled, account } = useMoralis()
    const qiteContractAddress = "0x31B102BA0766cfe7595e7529292F8D5a7Fb74587"

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [pools, setPools] = useState([])
    const [selectedPool, setSelectedPool] = useState("")
    const [liquidityAmountToken1, setLiquidityAmountToken1] = useState("0")
    const [liquidityAmountToken2, setLiquidityAmountToken2] = useState("0")
    const [liquidityAmount, setLiquidityAmount] = useState("0")
    const [liquidityToRemove, setLiquidityToRemove] = useState("0")
    const { runContractFunction: createLiquidityPool } = useWeb3Contract({
        abi: qiteDexAbi,
        contractAddress: qiteContractAddress,
        functionName: "createPairs",
    })

    const { runContractFunction: getPairs } = useWeb3Contract({
        abi: qiteDexAbi,
        contractAddress: qiteContractAddress,
        functionName: "getPairs",
    })

    const { runContractFunction: removeLiquidity } = useWeb3Contract({
        abi: qitePool,
        functionName: "removeLiquidity",
    })

    const { runContractFunction: addLiquidity } = useWeb3Contract({
        abi: qitePool,
        functionName: "addLiquidity",
    })

    const { runContractFunction: getLiquidityToken } = useWeb3Contract({
        abi: qitePool,
        functionName: "liquidityToken",
    })

    const { runContractFunction: getToken1 } = useWeb3Contract({
        abi: qitePool,
        functionName: "token1",
    })
    const { runContractFunction: getToken2 } = useWeb3Contract({
        abi: qitePool,
        functionName: "token2",
    })

    const { runContractFunction: getAllowance } = useWeb3Contract({
        abi: qitePoolToken,
        functionName: "allowance",
    })

    const { runContractFunction: approve } = useWeb3Contract({
        abi: qitePoolToken,
        functionName: "approve",
    })

    const { runContractFunction: getBalanceOf } = useWeb3Contract({
        abi: qitePoolToken,
        functionName: "balanceOf",
    })

    useEffect(() => {
        if (isWeb3Enabled) {
            const fetchPools = async () => {
                const pairs = await getPairs()

                if (pairs) {
                    setPools(pairs)
                }
            }

            fetchPools()
        }
    }, [isWeb3Enabled])

    useEffect(() => {
        if (selectedPool) {
            const fetchLiquidityAmount = async () => {
                const liqudityToken = await getLiquidityToken({
                    params: {
                        contractAddress: selectedPool,
                    },
                })

                if (liqudityToken) {
                    const balance = await getBalanceOf({
                        params: {
                            contractAddress: liqudityToken,
                            params: {
                                account: account,
                            },
                        },
                    })
                    setLiquidityAmount(ethers.utils.formatEther(balance))
                }
            }

            fetchLiquidityAmount()
        }
    }, [selectedPool])

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

    const handleAddLiquidity = async () => {
        try {
            const token1Address = await getToken1({
                params: {
                    contractAddress: selectedPool,
                },
            })

            const token2Address = await getToken2({
                params: {
                    contractAddress: selectedPool,
                },
            })

            const isToken1Approved = await checkAllowance(
                token1Address,
                account,
                selectedPool,
                ethers.utils.parseEther(liquidityAmountToken1)
            )

            const isToken2Approved = await checkAllowance(
                token2Address,
                account,
                selectedPool,
                ethers.utils.parseEther(liquidityAmountToken2)
            )
            if (!isToken2Approved || !isToken1Approved) {
                await requestApprovals(
                    isToken1Approved,
                    token1Address,
                    isToken2Approved,
                    token2Address,
                    selectedPool,
                    ethers.utils.parseEther(liquidityAmountToken1),
                    ethers.utils.parseEther(liquidityAmountToken2)
                )
            } else {
                await triggerLiquidity(
                    ethers.utils.parseEther(liquidityAmountToken1),
                    ethers.utils.parseEther(liquidityAmountToken2)
                )
            }
        } catch (e) {
            console.log(e)
        }
    }

    const checkAllowance = async (tokenAddress, owner, spender, amount) => {
        const allowance = await getAllowance({
            params: {
                contractAddress: tokenAddress,
                params: {
                    owner: owner,
                    spender: spender,
                },
            },
        })
        console.log(allowance)
        if (allowance.gt(amount)) {
            return true
        }
        return false
    }

    const requestApprovals = async (
        isToken1Approved,
        token1Address,
        isToken2Approved,
        token2Address,
        spender,
        amountToken1,
        amountToken2
    ) => {
        try {
            if (!isToken1Approved) {
                await approve({
                    params: {
                        contractAddress: token1Address,
                        params: {
                            spender: spender,
                            value: amountToken1,
                        },
                    },
                })
            }
            if (!isToken2Approved) {
                await approve({
                    params: {
                        contractAddress: token2Address,
                        params: {
                            spender: spender,
                            value: amountToken2,
                        },
                    },
                })
            }
            await triggerLiquidity(amountToken1, amountToken2)
        } catch (e) {
            console.log(e)
        }
    }

    const triggerLiquidity = async (amount1, amount2) => {
        try {
            await addLiquidity({
                params: {
                    contractAddress: selectedPool,
                    params: {
                        amountToken1: amount1,
                        amountToken2: amount2,
                    },
                },
                onError: (err) => {
                    console.log(err)
                },
                onSuccess: (tx) => {
                    console.log("Add liquidity succesfull")
                },
            })
        } catch (e) {
            console.log(e)
        }
    }

    const handleRemoveLiquidity = async () => {
        try {
            await removeLiquidity({
                params: {
                    contractAddress: selectedPool,
                    params: {
                        amountOfLiquidity:
                            ethers.utils.parseEther(liquidityToRemove),
                    },
                },
            })
        } catch (e) {
            console.log(e)
        }
    }

    return (
        <div className="mt-8 p-8 bg-white rounded-lg shadow-md max-w-lg mx-auto">
            <h2 className="text-2xl font-bold">Liquidity Pools</h2>
            {isWeb3Enabled && qiteContractAddress != null ? (
                <div>
                    <p className="mb-4">Welcome, {account}!</p>
                    <button
                        className="bg-green-500 text-white py-1 px-4 rounded-md hover:bg-green-600 mb-3"
                        onClick={(e) => {
                            setIsModalOpen(true)
                        }}
                    >
                        Create Liquidity Pool
                    </button>
                    <div className="mb-4">
                        <label className="text-sm font-bold">
                            Select Pool:
                        </label>
                        <select
                            value={selectedPool}
                            onClick={(e) => {
                                setSelectedPool(e.target.value)
                            }}
                            className="mt-1 p-2 border border-gray-300 rpunded-md w-full"
                        >
                            {pools.map((pool) => {
                                return (
                                    <option key={pool} value={pool}>
                                        {pool}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="text-sm font-bold">
                            Liquidity Token1 Amount :
                        </label>
                        <input
                            type="text"
                            value={liquidityAmountToken1}
                            onChange={(e) => {
                                setLiquidityAmountToken1(e.target.value)
                            }}
                            className="mt-1 p-2 border border-gray-300 rpunded-md w-full"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="text-sm font-bold">
                            Liquidity Token2 Amount :
                        </label>
                        <input
                            type="text"
                            value={liquidityAmountToken2}
                            onChange={(e) => {
                                setLiquidityAmountToken2(e.target.value)
                            }}
                            className="mt-1 p-2 border border-gray-300 rpunded-md w-full"
                        />
                    </div>
                    <button
                        className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 mb-4"
                        onClick={handleAddLiquidity}
                    >
                        Add Liquidity
                    </button>
                    <p className="text-sm font-bold">
                        Liquidity Amount: {liquidityAmount}
                    </p>
                    {liquidityAmount > 0 ? (
                        <div>
                            <div className="mb-4">
                                <label className="text-sm font-bold">
                                    Liquidity Amount to remove :
                                </label>
                                <input
                                    type="text"
                                    value={liquidityToRemove}
                                    onChange={(e) => {
                                        setLiquidityToRemove(e.target.value)
                                    }}
                                    className="mt-1 p-2 border border-gray-300 rpunded-md w-full"
                                />
                            </div>
                            <button
                                className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 mb-4"
                                onClick={handleRemoveLiquidity}
                            >
                                Remove Liquidity
                            </button>
                        </div>
                    ) : null}
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
