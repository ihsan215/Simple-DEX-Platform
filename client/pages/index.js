import { useRouter } from "next/router"

export default function Home() {
    const router = useRouter()
    return (
        <>
            <main className="w-screen flex justify-center items-center">
                <div className="py-8 mx-32">
                    <h1 className="text-white text-3xl font-bold">
                        DEX Platform
                    </h1>
                    <h3 className="text-white font-bold pt-12">
                        A decentralized exchange (DEX) is a type of
                        cryptocurrency exchange that operates without a central
                        authority or intermediary. Unlike traditional
                        centralized exchanges, DEXs facilitate peer-to-peer
                        trading of cryptocurrencies directly between users..
                    </h3>
                    <div>
                        <button
                            onClick={async () => {
                                router.push("/swap")
                            }}
                            className="bg-pink-500 hover:bg-pink-600 text-white font-bold rounded px-8 py-2 ml-8 mt-8"
                        >
                            Swap
                        </button>
                        <button
                            onClick={async () => {
                                router.push("/pools")
                            }}
                            className="bg-pink-500 hover:bg-pink-600 text-white font-bold rounded px-8 py-2 ml-8 mt-8"
                        >
                            Liquidity
                        </button>
                    </div>
                </div>
            </main>
        </>
    )
}
