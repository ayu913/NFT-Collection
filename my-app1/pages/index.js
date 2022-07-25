import { Contract, ethers, providers, utils } from "ethers"
import Head from "next/head"
import React, { useEffect, useRef, useState } from "react"
import Web3Modal from "web3modal"
import { NFT_CONTRACT_ABI, NFT_CONTRACT_ADDRESS } from "../constants"
//import ConnectToAuthereum from "web3modal/dist/providers/connectors/authereum"
//import { abi, NFT_CONTRACT_ADDRESS } from "../constants"
import styles from "../styles/Home.module.css"

export default function Home() {
  const [isOwner, setIsOwner] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [presaleStarted, setPresaleStarted] = useState(false)
  const [presaleEnded, setPresaleEnded] = useState(false)
  const [numTokensMinted, setNumTokensMinted] = useState("")
  const [loading, setLoading] = useState(false)
  const web3ModalRef = useRef()

  const getNumMintedTokens = async () => {
    try {
      const provider = await getProviderOrSigner()
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      )

      const numTokenIds = await nftContract.tokenIds()
      setNumTokensMinted(numTokenIds.toString())
    } catch (error) {
      console.error(error)
    }
  }

  const presaleMint = async () => {
    try {
      const signer = await getProviderOrSigner(true)

      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        signer
      )

      const txn = await nftContract.presaleMint({
        value: utils.parseEther("0.01"),
      })
      setLoading(true)

      await txn.wait()
      setLoading(false)
      window.alert("You successfully minted a CryptoDev!!")
    } catch (error) {
      console.error(error)
    }
  }

  const publicMint = async () => {
    try {
      const signer = await getProviderOrSigner(true)

      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        signer
      )

      const txn = await nftContract.mint({
        value: utils.parseEther("0.01"),
      })
      setLoading(true)
      await txn.wait()
      setLoading(false)
      window.alert("You successfully minted a Crypto Dev!")
    } catch (err) {
      console.error(err)
    }
  }

  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner(true)

      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      )

      const owner = await nftContract.owner()
      const signer = await getProviderOrSigner(true)
      const userAddress = await signer.getAddress()

      if (owner.toLowerCase() === userAddress.toLowerCase()) {
        setIsOwner(true)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true)

      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        signer
      )

      const txn = await nftContract.startPresale()
      setLoading(true)
      await txn.wait()
      setLoading(false)
      await checkIfPresaleStarted()
    } catch (error) {
      console.log(error)
    }
  }

  const checkIfPresaleStarted = async () => {
    try {
      const provider = await getProviderOrSigner()

      //Get an instance of your NFT Contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      )

      const isPresaleStarted = await nftContract.presaleStarted()
      if (!isPresaleStarted) {
        await getOwner()
      }
      setPresaleStarted(isPresaleStarted)

      return isPresaleStarted
    } catch (error) {
      console.log(error)
      return false
    }
  }

  const checkIfPresaleEnded = async () => {
    try {
      const provider = await getProviderOrSigner()
      //Get an instance of your NFT Contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      )
      // This will return a BigNumber because presaleEnded is a uint256
      // This will return a timestamp in seconds

      const presaleEndTime = await nftContract.presaleEnded()
      const currentTimeInSeconds = Date.now() / 100
      const hasPresaleEnded = presaleEndTime.lt(
        Math.floor(currentTimeInSeconds)
      )

      if (hasPresaleEnded) {
        setPresaleEnded(true)
      } else {
        setPresaleEnded(false)
      }
      return hasPresaleEnded
    } catch (error) {
      console.error(error)
      return false
    }
  }

  const connectWallet = async () => {
    try {
      await getProviderOrSigner()
      setWalletConnected(true)
    } catch (error) {
      console.error(error)
    }
    //Update "walletConnected" to be true
  }

  const getProviderOrSigner = async (needSigner = false) => {
    // we need to gain access to the provider/signer from Metamask

    const provider = await web3ModalRef.current.connect()
    const web3Provider = new ethers.providers.Web3Provider(provider)

    //If the user is not connected to rinkeby , tell them to switch to rinkeby

    const { chainId } = await web3Provider.getNetwork()
    if (chainId !== 4) {
      window.alert("Please switch to the Rinkeby network")
      throw new Error("Incorrect network")
    }

    if (needSigner) {
      const signer = web3Provider.getSigner()
      return signer
    }

    return web3Provider
  }

  const onPageLoad = async () => {
    await connectWallet()
    await getOwner()
    const presaleStarted = await checkIfPresaleStarted()
    if (presaleStarted) {
      await checkIfPresaleEnded()
    }
    await getNumMintedTokens()

    // Track in real time the number of minted NFTs
    setInterval(async () => {
      await getNumMintedTokens()
    }, 5 * 1000)

    // Track in real time the status of presale (started,endedm,whatever)
    setInterval(async () => {
      const presaleStarted = await checkIfPresaleStarted()
      if (presaleStarted) {
        await checkIfPresaleEnded()
      }
    }, 5 * 1000)
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      })
    }
    onPageLoad()
  }, [walletConnected])

  const renderButton = () => {
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your Wallet
        </button>
      )
    }

    if (loading) {
      return <span className={styles.description}>Loading....</span>
    }

    if (isOwner && !presaleStarted) {
      // render a button to start the presale
      return (
        <button onClick={startPresale} className={styles.button}>
          Start Presale
        </button>
      )
    }

    // If connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasnt started!</div>
        </div>
      )
    }

    // If presale started, but hasn't ended yet, allow for minting during the presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a Crypto
            Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      )
    }

    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      )
    }
  }

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name='description' content='Whitelist-Dapp' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {numTokensMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src='./cryptodevs/0.svg' />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  )
}
