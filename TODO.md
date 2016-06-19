## TODO
* Compensate for length of sword when player attacks west or north
* Eliminate bug which occasionally causes player animation to stick
* Eliminate occasional hiccup in position reconciliation
* Interpolate player to server recon position
* Broadcast and interpolate positions of other players
* Consider allowing 360 degrees player rotation
* Allow players to attack each other
* Implement lag compensation. Rather than broadcasting player positions, broadcast input histories of players to each other and play them back at a constant 100ms in the past, interpolating between each input.