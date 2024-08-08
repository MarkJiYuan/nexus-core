// const fs = require('fs');

// function readWavExtractPcm(inputFilePath, outputFilePath) {
//     // 读取整个WAV文件
//     const buffer = fs.readFileSync(inputFilePath);
  

//     // 确定PCM数据起始位置
//     const start = 44;  // WAV头通常是44字节长
//     const end = buffer.length;  // 通常可以省略，但明确指定以避免警告

//     // 使用slice提取PCM数据
//     const pcmData = buffer.slice(start, end);


//     // 将PCM数据写入新文件
//     fs.writeFileSync(outputFilePath, pcmData);
// }

// // 使用示例
// readWavExtractPcm('input.wav', 'output.pcm');

const fs = require('fs');

function parseWavHeader(buffer) {
    return {
        audioFormat: buffer.readUInt16LE(20),
        numChannels: buffer.readUInt16LE(22),
        sampleRate: buffer.readUInt32LE(24),
        byteRate: buffer.readUInt32LE(28),
        blockAlign: buffer.readUInt16LE(32),
        bitsPerSample: buffer.readUInt16LE(34),
        dataChunkSize: buffer.readUInt32LE(40)
    };
}

function readWavExtractPcm(inputFilePath, outputFilePath) {
    const buffer = fs.readFileSync(inputFilePath);
    const header = parseWavHeader(buffer);

    if (header.bitsPerSample !== 16) {
        console.error('Unsupported bit depth:', header.bitsPerSample);
        return;
    }

    // 跳过头部和任何非PCM数据
    const dataOffset = 44; // WAV标准头部大小
    const pcmData = buffer.slice(dataOffset, dataOffset + header.dataChunkSize);

    // 确保处理正确的数据格式
    const audioData = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);

    // 将PCM数据写入新文件
    fs.writeFileSync(outputFilePath, Buffer.from(audioData.buffer));
}

readWavExtractPcm('input.wav', 'output.pcm');
