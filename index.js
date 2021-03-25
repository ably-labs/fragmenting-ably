const Ably = require('ably');

class AblyFragmenter {
  constructor(apiKey, maxRate=50, maxSize=16384) {
    this.ably = new Ably.Realtime(apiKey);
    this.maxRate = maxRate;
    this.msgInterval = 1000 / maxRate;
    this.maxSize = maxSize - 42;
    this.messageChunksReceived = {};
    this.messageChunksSent = {};
    this.messageChunks = {};
  }

  subscribe(channelName, callback) {
    let channel = this.ably.channels.get(channelName);
    channel.subscribe((message) => {
      if (message.data.pos == 'end') {
        let msg = this.messageChunks[message.name].join('');
        if (callback) callback(msg);
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
    let reg = new RegExp(".{1," + this.maxSize + "}", 'g');
    let chunks = message.match(reg);
    this.messageChunksSent[rnd] = 0;
    for (let i=0; i < chunks.length; i++) {
      this.sendMessages(channel, rnd, chunks, i);
    }
    if (callback) callback(null);
  }

  sendMessages(channel, id, data, pos) {
    setTimeout(() => { 
      channel.publish("id:" + id, 
        { 'pos': pos, 'data': data[pos] },
        (err) => {
        if (err) {
          setTimeout(() => { this.sendMessages(channel, id, data, pos); }, 1000);
        } else {
          this.messageChunksSent[id]++;
          if (this.messageChunksSent[id] == data.length) {
            this.sendEnd(id, channel);
            this.messageChunksSent[id] = 0;
          }
        }
      });
    }, this.msgInterval * pos);
  }

  sendEnd(id, channel) {
    channel.publish("id:" + id, { 'pos': 'end' }, 
      (err) => {
        if (err) {
          setTimeout(() => { this.sendEnd(id); }, 1000);
        }
      }
    );
  }
}
module.exports = AblyFragmenter;
