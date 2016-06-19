## TODO

### Near-future
* Compensate for length of sword when player attacks west or north
* Eliminate bug which occasionally causes player animation to stick
* Eliminate occasional hiccup in position reconciliation
* Interpolate player to server recon position
* Broadcast and interpolate positions of other players
* Consider allowing 360 degrees player rotation
* Allow players to attack each other
* Implement lag compensation. Rather than broadcasting player positions, broadcast input histories of players to each other and play them back at a constant 100ms in the past, interpolating between each input. On the server, store histories for each player until server knows what each player was doing at a given time (or an arbitrary fixed value of time has passed when the data is too old to matter anyway). If player A attacks player B, look to see where player B was positioned on player A's machine at the time of attack. If server happens to have input for player B at that moment, use the position calculated from that input. Otherwise, calculate the position from the time and the inputs stored from immediately before and after that time.
* Prompt player for username on connection and accept if not already taken
* Currently input sample and input history upload occur at the same rate of 6 times/sec. This is not likely to be a high enough rate for sampling in an action game where, for instance, a player may attack at any instant and for any duration. For one thing, some such attacks will happen between samples and thus never get logged or uploaded. Perhaps a better approach is to track the last time input was uploaded and check each sample how many samples we have recorded since that time. Once a threshold is hit, upload the history to the server. So the sample rate can be changed to something like 24 times per second, and the treshold of samples before uploading 4 (24 / 4 = 6 uploads per second).

### Eventually
* Let client configure its samples per second and upload rate. Track this info on the server and accumulate responses, only sending them to client each upload (will no longer be able to use broadcast for movement).

## MISC
* Figure this out: If you sample input every input sample tick rather than only if the input has changed and keep the input sample tick at 25 times per second, when you move the player rightward or downward the server only reconciles at the beginning or ending of the movement and the movement is smooth, but if you move the player leftward or upward, reconciling happens every server tick and the movement is jerky. However, setting the input sample rate at 60 samples per second, movement is smooth in any direction. This seems to have something to do with the upload tick rate -- if the same rate is evenly divisible by the upload rate, less reconciliation is necessary. Amazingly, at 6 samples per second and 6 uploads per second, it seems reconciliation is never necessary.

## NOTES
Todo... lol