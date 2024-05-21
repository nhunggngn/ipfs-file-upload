import React, { Component } from 'react';
import { Table, Grid, Button, Form } from 'react-bootstrap';
import './App.css';
import web3 from './web3';
import storehash from './storehash';
import axios from 'axios'; // Sử dụng axios để gửi yêu cầu HTTP
import dotenv from 'dotenv';
dotenv.config();

class App extends Component {
  state = {
    ipfsHash: null,
    buffer: '',
    ethAddress: '',
    blockNumber: '',
    transactionHash: '',
    gasUsed: '',
    txReceipt: ''
  };

  captureFile = (event) => {
    event.stopPropagation();
    event.preventDefault();
    const file = event.target.files[0];
    let reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = () => this.convertToBuffer(reader);
  };

  convertToBuffer = async (reader) => {
    const buffer = await Buffer.from(reader.result);
    this.setState({ buffer });
  };

  onClick = async () => {
    try {
      this.setState({ blockNumber: "waiting.." });
      this.setState({ gasUsed: "waiting..." });
      await web3.eth.getTransactionReceipt(this.state.transactionHash, (err, txReceipt) => {
        console.log(err, txReceipt);
        this.setState({ txReceipt });
      });
      this.setState({ blockNumber: this.state.txReceipt.blockNumber });
      this.setState({ gasUsed: this.state.txReceipt.gasUsed });
    } catch (error) {
      console.log(error);
    }
  };

  onSubmit = async (event) => {
    event.preventDefault();
  
    try {
      const accounts = await web3.eth.getAccounts();
      console.log('Sending from Metamask account: ' + accounts[0]);
      const ethAddress = await storehash.options.address;
      this.setState({ ethAddress });
  
      const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY;
      const pinataSecretApiKey = process.env.REACT_APP_PINATA_SECRET_API_KEY;
  
      const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
      const data = new FormData();
      data.append('file', new Blob([this.state.buffer]), this.state.fileName || 'file-upload');
  
      const metadata = JSON.stringify({
        name: this.state.fileName || 'file-upload'
      });
      data.append('pinataMetadata', metadata);
  
      const options = JSON.stringify({
        cidVersion: 0
      });
      data.append('pinataOptions', options);
  
      const result = await axios.post(url, data, {
        maxContentLength: 'Infinity', 
        headers: {
          'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretApiKey
        }
      });
  
      const ipfsHash = result.data.IpfsHash;
      console.log('IPFS Hash: ', ipfsHash);
  
      this.setState({ ipfsHash });
  
      storehash.methods.sendHash(ipfsHash).send({
        from: accounts[0]
      }, (error, transactionHash) => {
        console.log(transactionHash);
        this.setState({ transactionHash });
      });
    } catch (error) {
      console.error('Error uploading file to Pinata: ', error);
    }
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1>IPFS</h1>
        </header>
  
        <hr />
        <Grid>
          <h3> Choose file to send to IPFS </h3>
          <Form onSubmit={this.onSubmit}>
            <input
              type="file"
              onChange={this.captureFile}
            />
            
            <input className='input-file-name'
              type="text"
              placeholder="Enter file name"
              onChange={(e) => this.setState({ fileName: e.target.value })}
            />
        
            <Button
              
              bsStyle="primary"
              type="submit">
              Send it
            </Button>
          </Form>
          <hr />
          <Button onClick={this.onClick}> Get Transaction Receipt </Button>
          <Table bordered responsive>
            <thead>
              <tr>
                <th>Tx Receipt Category</th>
                <th>Values</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>IPFS Hash # stored on Eth Contract</td>
                <td>{this.state.ipfsHash}</td>
              </tr>
              <tr>
                <td>Ethereum Contract Address</td>
                <td>{this.state.ethAddress}</td>
              </tr>
              <tr>
                <td>Tx Hash # </td>
                <td>{this.state.transactionHash}</td>
              </tr>
              <tr>
                <td>Block Number # </td>
                <td>{this.state.blockNumber}</td>
              </tr>
              <tr>
                <td>Gas Used</td>
                <td>{this.state.gasUsed}</td>
              </tr>
            </tbody>
          </Table>
        </Grid>
      </div>
    );
  }  
}

export default App;
