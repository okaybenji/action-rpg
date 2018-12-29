This is a test of a real-time multiplayer action RPG in the vein of The Legend of Zelda. I was attempting to implement QuakeWorld-style networking for a 2D game in JavaScript.

I stopped working on it a while ago. In its current state, it supports multiple players connecting, moving around, and chatting with one another.

Here are my notes on what is needed for QuakeWorld-style network code:

## Lag compensation
Client renders entities’ positions, rotations, etc. a consistent amount of time in the past, e.g. 100ms. (An aside: That amount of time could be tailored to each client. For instance, it could be regularly set to be only slightly higher than their max latency in the last few seconds. But bear in mind that this may give players with faster connections an unfair advantage, and thus it may be better to set the temporal distance according to the slowest connection, or to pick a fair rate and stick with it. Valve sticks with 100ms by default.) The server should be aware that players are e.g. shooting at other players a fixed time in the past and judge whether a ‘hit’ occurred based on where the other players would have appeared on the client at that time. In order to support this, the server should store client input history for up to, say, 1 second. The server should estimate at what point a client command was issued with the following formula. (Note here that accounting for client interpolation makes this calculation tricky… This interpolation is explained below.)

Command Execution Time = Current Server Time - Packet Latency - Client View Interpolation

## Client-side prediction
The client and server both use the same calculation to determine where the client should be and what interactions the client has triggered based upon the player’s inputs. This is called prediction because the client does not have the authority to declare the player’s position, health, collected power-ups, etc. The player’s inputs are sent to the server so that the server can determine all of these things and then instruct the client what its current state should be. (This prevents cheating and ensures there is one source of truth for the state of the game.)

## Server reconciliation
Sometimes, the client prediction will be wrong. (This is called a prediction error and can be caused by lag — the client not having up-to-date information on the positions of moveable and impenetrable entities, for instance… or cheating.) The server should course-correct any inconsistencies between its state and the client’s by updating the client’s state. However, doing so immediately would cause the client to jump to a state in the past. This is because some time will have passed between the time the client sent input to the server, the server processed the input and sent a response, and the client received the response. Thus, the client will need to update its state and then reapply its input history up to the present in order to determine what its state should currently be.

## Interpolation
The client should not try to predict the state of entities such as other players, and only updating other players’ positions upon receipt of a server message (say, every 50ms) would result in choppy animations. Thus, movements of other entities should be interpolated. (The duration of this interpolation should be the same as the lag compensation’s temporal distance.)

## Smoothing
This is a form of interpolation that applies to the client player and is applied when a prediction error occurs. Even with reconciliation, the client’s change in position/other state during recon may be jarring. Thus, the client should interpolate its current state to the corrected state over time.

## Delta compression
Data is compressed by only sending the entire world state upon connection and after service disruption. At other times, only that data which has changed is transmitted.

## Other data compression?
This may not be necessary in our current age, and may increase the load on the server. But ideally the data traveling between client and server would be compressed before it is transmitted and then uncompressed before being processed.

## Fake lag setting for debugging
Allow developers to enable artificial latency for testing out the network code and its compatibility with the game code.

## More info

For a slightly more in-depth discussion along with some code samples, see: http://www.gabrielgambetta.com/fast_paced_multiplayer.html

Also see: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
