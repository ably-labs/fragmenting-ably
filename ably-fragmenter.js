const Ably = require('ably');

class AblyFragmenter {
  constructor(apiKey, maxRate=50, maxSize=16384) {
    this.ably = new Ably.Realtime(apiKey);
    this.maxRate = maxRate;
    this.msgInterval = 1000 / maxRate;
    this.maxSize = maxSize - 42;
    this.messageChunksReceived = {};
    this.messageChunksSent = {};
  }

  subscribe(channelName, callback) {
    let channel = this.ably.channels.get(channelName);
    channel.subscribe((message) => {
      if (message.data.pos == 'end') {
        let msg = this.messageChunks[message.name].join('');
        callback(msg);
        return;
      }
      if (!this.messageChunks[message.name]) {
        this.messageChunks[message.name] = [];
      }
      this.messageChunks[message.name][message.data.pos] = message.data.data;
    });
  }

  publish(channelName, message, callback) {
    let channel = this.ably.channels.get(channelName);
    let rnd = Math.random();
    // convert image file to base64 string
    let reg = new RegExp(".{1," + this.maxSize + "}", g);
    let chunks = message.match(reg);
    this.messageChunksSent[rnd] = 0;
    for (let i=0; i < chunks.length; i++) {
      this.sendMessages(channel, rnd, chunks, i);
    }
    callback(null);
  }

  sendMessages(channel, id, data, pos) {
    setTimeout(function() { 
      channel.publish("id:" + id, 
        { 'pos': pos, 'data': data[pos] },
        (err) => {
        if (err) {
          setTimeout(function() { sendMessages(id, data, pos); }, 1000);
        } else {
          this.messageChunksSent[id]++;
          if (this.messageChunksSent[id] == data.length) {
            sendEnd(id);
            this.messageChunksSent[id] = 0;
          }
        }
      });
    }, msgInterval * pos);
  }

  sendEnd(id, pos) {
    channel.publish("id:" + id, { 'pos': 'end' }, 
      (err) => {
        if (err) {
          setTimeout(() => { sendEnd(id); }, 1000);
        }
      }
    );
  }
}
module.exports = AblyFragmenter;
