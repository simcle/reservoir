import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import ModbusRTU from 'modbus-serial'
const app = express()
app.use(express.static('public'))
const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
})

const client = new ModbusRTU()
const ADAM_IP = '192.168.100.121'
const ADAM_PORT = 502
const INTERVAL = 500
const RECCONECT_INTERVAL = 5000

let isConnected = false

const dataEmit = {
    p01: 0,
    p02: 0,
    p03: 0,
    p04: 0,
    p05: 0,
    p06: 0,
    level: 0,
    error: ''
}

const connectToADAM = async () => {
    try {
        dataEmit.error = 'Sedang mencoba menghubungkan ke PLC...'
        await client.connectTCP(ADAM_IP, {port: ADAM_PORT})
        client.setID(1)
        isConnected = true
        dataEmit.error = ''
        startReadingData()
    } catch (error) {
        dataEmit.error = 'Gagal terhubung ke PLC'
        console.error('Gagal terhubung ke PLC ADAM', error.message)
        isConnected = false
        setTimeout(connectToADAM, RECCONECT_INTERVAL)
    }
}

const startReadingData = () => {
    setInterval(async () => {
        if(!isConnected) return
        try {
            dataEmit.error = ''
            const pmp1 = await client.readHoldingRegisters(2018, 1)
            dataEmit.p01 = pmp1.buffer.readInt16BE(0)
            const pmp2 = await client.readHoldingRegisters(2021, 1)
            dataEmit.p02 = pmp2.buffer.readInt16BE(0)
            const pmp3 = await client.readHoldingRegisters(2024, 1)
            dataEmit.p03 = pmp3.buffer.readInt16BE(0)
            const pmp4 = await client.readHoldingRegisters(2027, 1)
            dataEmit.p04 = pmp4.buffer.readInt16BE(0)
            const pmp5 = await client.readHoldingRegisters(2030, 1)
            dataEmit.p05 = pmp5.buffer.readInt16BE(0)
            const pmp6 = await client.readHoldingRegisters(2033, 1)
            dataEmit.p06 = pmp6.buffer.readInt16BE(0)
            const lv = await client.readHoldingRegisters(2245, 1)
            const level = (parseInt(lv.data[0]) * 100) / 100
            dataEmit.level = level
        } catch (error) {
            console.error('Error saat membaca data', error.message)
            dataEmit.error = 'Error saat membaca data'
            isConnected = false
            client.close()
            setTimeout(connectToADAM, RECCONECT_INTERVAL)
        }
    }, INTERVAL)
}

setInterval(() => {
    io.emit('data', dataEmit)
}, 300)


const PORT = 3000 || process.env.PORT
httpServer.listen(PORT, () => {
    console.log('server listen on port: '+PORT)
    connectToADAM()
})


