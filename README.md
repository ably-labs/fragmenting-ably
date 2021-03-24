# Sending images with Ably in JS

This repository contains a basic HTML page using the Ably JS client library to send images between clients. It does this by breaking up images into chunks, and then sending them through Ably to be re-assembled by clients.

The only change required to make this work is to replace the 'INSERT_API_KEY' text with an Ably API key, which you can get from https://ably.com/accounts/any/apps/any/app_keys.