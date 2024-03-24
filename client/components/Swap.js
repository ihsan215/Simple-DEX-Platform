import { useMoralis, useWeb3Contract } from "react-moralis"
import {
    qiteAddresses,
    qiteDexAbi,
    qitePool,
    qitePoolToken,
} from "@/contracts/qite-dex-constant"
import { useEffect, useState } from "react"
import { ethers } from "ethers"

const Swap = () => {
    const { chainID: chainIdHex, isWeb3Enabled, account } = useMoralis()
    const qiteContractAddress = "0x31B102BA0766cfe7595e7529292F8D5a7Fb74587"
    const [selectedPool, setSelectedPool] = useState("")
    const [pools, setPools] = useState([])
    const [token1Address, setToken1Address] = useState("")
    const [token2Address, setToken2Address] = useState("")
    const [tokens, setTokens] = useState([])
    const [amount, setAMount] = useState("0")
    const [expectedAmount, setExpectedAmount] = useState("0")

    const [token1Balance, setToken1Balance] = useState("0")
    const [token2Balance, setToken2Balance] = useState("0")
    const [token1LiqBalance, setToken1LiqBalance] = useState("0")
    const [token2LiqBalance, setToken2LiqBalance] = useState("0")

    const { runContractFunction: getPairs } = useWeb3Contract({
        abi: qiteDexAbi,
        contractAddress: qiteContractAddress,
        functionName: "getPairs",
    })

    const { runContractFunction: getToken1 } = useWeb3Contract({
        abi: qitePool,
        functionName: "token1",
    })
    const { runContractFunction: getToken2 } = useWeb3Contract({
        abi: qitePool,
        functionName: "token2",
    })

    const { runContractFunction: swapTokens } = useWeb3Contract({
        abi: qitePool,
        functionName: "swapTokens",
    })

    const { runContractFunction: getEstimateOutputAmount } = useWeb3Contract({
        abi: qitePool,
        functionName: "estimateOutputAmount",
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
            const fetchToken = async () => {
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

                setToken1Address(token1Address)
                setToken2Address(token2Address)
                setTokens([token1Address, token2Address])
            }

            fetchToken()
        }
    }, [selectedPool])

    const hanleSwap = async () => {
        try {
            const isToken1Approved = await checkAllowance(
                token1Address,
                account,
                selectedPool,
                ethers.utils.parseEther(amount)
            )
            if (!isToken1Approved) {
                requestApprovals(
                    isToken1Approved,
                    token1Address,
                    token2Address,
                    selectedPool,
                    ethers.utils.parseEther(amount),
                    ethers.utils.parseEther(expectedAmount)
                )
            } else {
                await triggerSwap(
                    token1Address,
                    token2Address,
                    ethers.utils.parseEther(amount),
                    ethers.utils.parseEther(expectedAmount)
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
        if (allowance.gt(amount)) {
            return true
        }
        return false
    }

    const requestApprovals = async (
        isToken1Approved,
        token1Address,
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
                    onError: (e) => console.log("apprve", e),
                })
            }

            await triggerSwap(
                token1Address,
                token2Address,
                amountToken1,
                amountToken2
            )
        } catch (e) {
            console.log(e)
        }
    }

    const triggerSwap = async (
        token1Address,
        token2Address,
        amountIn,
        amountOut
    ) => {
        try {
            await swapTokens({
                params: {
                    contractAddress: selectedPool,
                    params: {
                        fromToken: token1Address,
                        toToken: token2Address,
                        amountIn: amountIn,
                        amountOut: amountOut,
                    },
                },
                onError: (e) => console.log("SWAP", e),
            })
        } catch (e) {
            console.log(e)
        }
    }

    useEffect(() => {
        if (token1Address && token2Address && selectedPool) {
            const fetchTokenAmount = async () => {
                const balanceToken1 = await getBalanceOf({
                    params: {
                        contractAddress: token1Address,
                        params: {
                            account: account,
                        },
                    },
                })
                const balanceToken2 = await getBalanceOf({
                    params: {
                        contractAddress: token2Address,
                        params: {
                            account: account,
                        },
                    },
                })

                const balanceToken1Liq = await getBalanceOf({
                    params: {
                        contractAddress: token1Address,
                        params: {
                            account: selectedPool,
                        },
                    },
                })

                const balanceToken2Liq = await getBalanceOf({
                    params: {
                        contractAddress: token2Address,
                        params: {
                            account: selectedPool,
                        },
                    },
                })

                setToken1Balance(ethers.utils.formatEther(balanceToken1))
                setToken2Balance(ethers.utils.formatEther(balanceToken2))

                setToken1LiqBalance(ethers.utils.formatEther(balanceToken1Liq))
                setToken2LiqBalance(ethers.utils.formatEther(balanceToken2Liq))
            }

            fetchTokenAmount()
        }
    }, [token1Address])

    return (
        <div className="mt-8 p-8 bg-white rounded-lg shadow-md max-w-lg mx-auto">
            <h2 className="text-2xl font-bold">Swap </h2>
            {isWeb3Enabled && qiteContractAddress != null ? (
                <div>
                    <p className="mb-4">Welcome, {account}!</p>

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
                        <label className="text-sm font-bold">Token From:</label>
                        <select
                            value={token1Address}
                            onChange={(e) => {
                                if (tokens && tokens.length > 0) {
                                    setToken1Address(e.target.value)
                                    if (tokens[0] == e.target.value) {
                                        setToken2Address(tokens[1])
                                    } else {
                                        setToken2Address(tokens[0])
                                    }
                                }
                            }}
                            className="mt-1 p-2 border border-gray-300 rpunded-md w-full"
                        >
                            {tokens.map((token) => {
                                return (
                                    <option key={token} value={token}>
                                        {token}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="text-sm font-bold">Token To:</label>
                        <select
                            value={token2Address}
                            className="mt-1 p-2 border border-gray-300 rpunded-md w-full"
                            disabled={true}
                        >
                            {tokens.map((token) => {
                                return (
                                    <option key={token} value={token}>
                                        {token}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="text-sm font-bold">Amount:</label>
                        <input
                            type="text"
                            value={amount}
                            className="mt-1 p-2 border border-gray-300 rpunded-md w-full"
                            onChange={async (e) => {
                                setAMount(e.target.value)
                                if (e.target.value > 0) {
                                    const estimatedAmount =
                                        await getEstimateOutputAmount({
                                            params: {
                                                contractAddress: selectedPool,
                                                params: {
                                                    amountIn:
                                                        ethers.utils.parseEther(
                                                            e.target.value
                                                        ),
                                                    fromToken: token1Address,
                                                },
                                            },
                                        })
                                    setExpectedAmount(
                                        ethers.utils.formatEther(
                                            estimatedAmount
                                        )
                                    )
                                } else {
                                    setExpectedAmount("0")
                                }
                            }}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="text-sm font-bold">
                            Expected Amount Out:
                        </label>
                        <input
                            type="text"
                            value={expectedAmount}
                            className="mt-1 p-2 border border-gray-300 rpunded-md w-full"
                            disabled={true}
                        />
                    </div>
                    <button
                        className="bg-green-500 text-white py-1 px-4 rounded-md hover:bg-green-600 mb-3"
                        onClick={(e) => {
                            hanleSwap()
                        }}
                    >
                        Swap
                    </button>
                    <div className="mb-4">
                        <p className="text-sm font-bold">
                            Token 1 Balance: {token1Balance}
                        </p>
                        <p className="text-sm font-bold">
                            Token 2 Balance: {token2Balance}
                        </p>
                        <p className="text-sm font-bold">
                            Amount Token 1 Liquidity Balance: {token1LiqBalance}
                        </p>
                        <p className="text-sm font-bold">
                            Amount Token 2 Liquidity Balance: {token2LiqBalance}
                        </p>
                    </div>
                </div>
            ) : (
                <div>Please Log In!</div>
            )}
        </div>
    )
}

export default Swap
