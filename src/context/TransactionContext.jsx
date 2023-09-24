import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = React.createContext();

const { ethereum } = window;

const getEthereumContract = async () => {
	const provider = new ethers.BrowserProvider(ethereum);
	const signer = await provider.getSigner();
	const transactionContract = new ethers.Contract(
		contractAddress,
		contractABI,
		signer
	);

	return transactionContract;
};

export const TransactionProvider = ({ children }) => {
	const [currentAccount, setCurrentAccount] = useState("");
	const [formData, setFormData] = useState({
		addressTo: "",
		amount: "",
		keyword: "",
		message: "",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [transcationCount, setTranscationCount] = useState(
		localStorage.getItem("transcationCount")
	);
	const [transactions, setTransactions] = useState([]);

	const handleChange = (e, name) => {
		setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
	};

	const getAllTransactions = async () => {
		try {
			if (!ethereum) return alert("Please install metamask");
			const transactionContract = await getEthereumContract();
			const availableTransactions =
				await transactionContract.getAllTransaction();

			const structuredTransaction = availableTransactions.map(
				(transaction) => ({
					addressTo: transaction.receiver,
					addressFrom: transaction.sender,
					amount: Number(transaction.amount) / 10 ** 18,
					keyword: transaction.keyword,
					timestamp: new Date(Number(transaction.timestamp)).toLocaleString(),
					message: transaction.message,
				})
			);

			setTransactions(structuredTransaction);
		} catch (error) {
			console.log(error);
		}
	};

	const checkIfWalletIsConnected = async () => {
		try {
			if (!ethereum) return alert("Please install metamask");

			const accounts = await ethereum.request({ method: "eth_accounts" });
			if (accounts.length) {
				setCurrentAccount(accounts[0]);
				getAllTransactions();
			} else {
				console.log("No accounts found");
			}
		} catch (error) {
			console.log(error);

			throw new Error("No ethereum object.");
		}
	};

	const checkIfTransactionExist = async () => {
		try {
			const transactionContract = await getEthereumContract();
			const transactionCount = await transactionContract.getTransactionCount();

			window.localStorage.setItem("transactionCount", transactionCount);
		} catch (error) {
			console.log(error);

			throw new Error("No ethereum object.");
		}
	};

	const connectWallet = async () => {
		try {
			if (!ethereum) return alert("Please install metamask");

			const accounts = await ethereum.request({
				method: "eth_requestAccounts",
			});

			setCurrentAccount(accounts[0]);
		} catch (error) {
			console.log(error);

			throw new Error("No ethereum object.");
		}
	};

	const sendTransaction = async () => {
		try {
			if (!ethereum) return alert("Please install metamask");
			const { addressTo, amount, keyword, message } = formData;
			const transactionContract = await getEthereumContract();
			const parsedAmount = ethers.parseEther(amount);

			const hexValue = ethers.toBeHex(parsedAmount);
			if (!ethers.isHexString(hexValue) || hexValue === "0x0") {
				return alert("Invalid amount or zero amount.");
			}

			const tx = await ethereum.request({
				method: "eth_sendTransaction",
				params: [
					{
						from: currentAccount,
						to: addressTo,
						gas: "0x5208", // 21000 Gwei
						value: hexValue,
					},
				],
			});

			const transactionHash = await transactionContract.addToBlockchain(
				addressTo,
				parsedAmount,
				message,
				keyword
			);

			setIsLoading(true);
			console.log(`Loading - ${transactionHash.hash}`);
			await transactionHash.wait();

			setIsLoading(false);
			console.log(`Success - ${transactionHash.hash}`);

			const transactionCount = await transactionContract.getTransactionCount();

			setTranscationCount(transactionCount);

			window.reload();
		} catch (error) {
			console.log(error);

			throw new Error("No ethereum object.");
		}
	};

	useEffect(() => {
		checkIfWalletIsConnected();
		checkIfTransactionExist();
	}, []);

	return (
		<TransactionContext.Provider
			value={{
				connectWallet,
				currentAccount,
				formData,
				setFormData,
				handleChange,
				sendTransaction,
				transactions,
				isLoading,
			}}
		>
			{children}
		</TransactionContext.Provider>
	);
};

// 2:00:00
