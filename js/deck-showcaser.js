$(document).ready(function() {
	var btn = $( "#input-card .btn" );
	var input = $( "#input-card #input" );
	var result = $( "#result-card #result-body" );
	input.focus(function() {
		input.select();
		input.removeClass("loaded");
	});

	function resizeFakeCards() {
		$(".fake-card").each(function() {
			var that = $(this);
			var width = that.parent().parent().width();
			that.css("height",(width*1.25)+"px");
		});
	}
	$(window).resize(resizeFakeCards);

	// Clears all visible cards, resets the columns, and returns them
	function resetResults() {
		result.empty();
		var row = $("<div class='mtg-row'></div>");
		var creatures = $("<div class='mtg-col'><strong>Creatures</strong><div class='mtg-list'></div></div>");
		var noncreatures = $("<div class='mtg-col'><strong>Non-creatures</strong><div class='mtg-list'></div></div>");
		var lands = $("<div class='mtg-col'><strong>Lands</strong><div class='mtg-list'></div></div>");
		var columns = {"creatures":$(".mtg-list",creatures),"noncreatures":$(".mtg-list",noncreatures),"lands":$(".mtg-list",lands)};
		row.append([creatures,noncreatures,lands]);
		result.append(row);

		return columns;
	}

	// Fill text box
	function buildCardInputBox( cards ) {
		var cards_list = [];

		// first extract amount, name, and set
		$.each(cards,function(category,_cards) {
			$.each(_cards,function(index,card) {
				cards_list.push({amount:card.amount,name:card.name,'set':card.set});
			});
		});

		// Sort by card amount, or alphabetically if they're the same
		cards_list.sort(function(a,b) {
			if (a.amount == b.amount) {
				return a.name.localeCompare(b.name);
			}
			return (a.amount < b.amount) ? -1 : 1;
		});

		// convert into string
		$.each(cards_list,function(idx,card) {
			cards_list[idx] = card.amount + " " + card.name + " (" + card.set + ")";
		});

		input.val(cards_list.join("\n"));
	}

	// Build share URL
	function buildShareURL( cards ) {
		var cards_list = [];

		// first extract multiverseid and amount
		$.each(cards,function(category,_cards) {
			$.each(_cards,function(index,card) {
				cards_list.push({amount:parseInt(card.amount),multiverseid:card.multiverseid})
			});
		});

		// Sort by card amount
		cards_list.sort(function(a,b) {
			if (a.amount == b.amount) {return 0;}
			return (a.amount < b.amount) ? -1 : 1;
		});

		var query_list = [];
		var special_chars = ["","a","b","c","d"]; // a=1,b=2,c=3,d=4 cards
		var last_amount = 1;
		$.each(cards_list,function(idx,card) {
			// if the card amount changes, insert a special character as long as amount <= 4, or else insert the literal amount
			if (card.amount <= 4) {
				if (card.amount != last_amount) {
					query_list.push(special_chars[card.amount]);
					last_amount = card.amount;
				}
			} else {
				if (last_amount != 0) {
					query_list.push("n"); // n="normal", count each card individually
					last_amount = 0;
				}
				query_list.push(card.amount);
			}

			query_list.push(card.multiverseid);
		});

		location.hash = LZString.compressToEncodedURIComponent(query_list.join(","));
	}

	// Displays cards
	function displayCards( cards ) {
		var columns = resetResults();

		$.each(cards,function(card_category,_cards) {
			if (card_category == "lands") { // sort lands alphabetically
				_cards.sort(function(a,b) {
					return a.name.localeCompare(b.name);
				});
			} else { // sort other cards by CMC
				_cards.sort(function(a,b) {
					if (a.cmc == b.cmc) {
						// if cmc is the same, sort by name
						return a.name.localeCompare(b.name);
					}
					return a.cmc < b.cmc ? -1 : 1;
				});
			}

			var parent = columns[card_category];
			var num_child = 0;

			$.each(_cards,function(idx,card) {
				var amount = card.amount;

				if (amount > 4) {
					parent.append(card.a);
					card.a.append($("<div class='card-counter'>" + amount + "x</div>").hide());
					num_child++;
				} else {
					for(var i=0;i<amount;i++) {
						parent.append(card.a.clone());
						num_child++;
					}
				}
			});
		});

		function showImg(that) {
			$(".card-counter",that.parent()).show();
			$(".fake-card",that.parent()).remove();
			that.show();
		}

		$("img",result).on("load", function() {
			showImg($(this));
		}).each(function() {
			if(this.complete) {
				showImg($(this));
			} else {
				var parent = $(this).parent();
				if (parent.is(":first-child")) {
					parent.append("<div class='fake-card'></div>"); // insert fake card
				}
			}
		});

		$("#result-card .collapse").collapse("show");
		input.addClass("loaded");
		resizeFakeCards();
		setTimeout(function() {resizeFakeCards();},200);
	}

	function processCard(card,cards,amount) {
		var name = card.name;
		var type = card.type_line;
		var image = undefined;
		var fix_border_class = "";

		var multi_images = {split:true, flip:true, transform:true, double_faced_token:true};
		if (multi_images[card.layout]) {
			if (card.card_faces[0].image_uris.border_crop) {
				image = card.card_faces[0].image_uris.border_crop;
				fix_border_class = "fix-border";
			} else {
				image = card.card_faces[0].image_uris.png;
			}
		} else {
			if (card.image_uris.border_crop) {
				image = card.image_uris.border_crop;
				fix_border_class = "fix-border";
			} else {
				image = card.image_uris.png;
			}
		}

		if (typeof image == "undefined") {
			alert("Warning: Card '" + card.name + "' doesn't have an image!");
		}

		var card_category = "creatures";
		if (type.toLowerCase().indexOf("creature") == -1) {card_category = "noncreatures";}
		if (type.toLowerCase().indexOf("land") != -1) {card_category = "lands";}

		//var card_url = "http://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=" + card.multiverseid;
		var card_url = card.scryfall_uri;

		var a = $("<a target='_blank' href='"+card_url+"' class='mtg-card'></a>");
		var img = $("<img src='"+image+"' class='" + fix_border_class + "'>");
		img.hide();
		a.append(img);

		if (typeof cards[card_category] == "undefined") {cards[card_category] = [];}
		cards[card_category].push({
			name: name,
			amount: amount,
			image: image,
			a: a,
			cmc: card.cmc,
			multiverseid:card.multiverse_ids[0],
			'set': card.set
		});
	}

	function loadCardsFromInput() {
		var txt = input.val().trim();
		var lines = txt.split("\n");

		var requests = {};
		var amount_by_name = {};
		var found_cards = {};

		$.each(lines,function(row,line) {
			line = line.trim();
			try {
				var re = /^(\d*) (.*?) ?(\((.*?)\))? ?(\d*)?$/i;
				var match = line.match(re);

				var amount = parseInt(match[1]);
				var name = match[2];
				var set = match[4] || "*";

				if (set == "DAR") {set = "DOM";} // Hopefully temporary, check back later, maybe erase

				/*
				if (set == "*") {
					alert("Set unspecified for card '" + name + "'! For now, the API doesn't have a good way to search for cards without a set, so I'm gonna need you to specify one. Action aborted.");
					return false;
				}
				*/
			} catch(e) {
				alert("Error parsing deck: " + e);
				return;
			}

			amount_by_name[name] = amount;
			found_cards[name] = false;

			if (typeof requests[set] == "undefined") {
				requests[set] = [[]];
			}

			// Special case for requesting basic lands with no set specified
			/*
			if (set == "*") {
				var lands = {"Plains":true,"Mountain":true,"Swamp":true,"Forest":true,"Island":true};
				if (typeof lands[name] != "undefined") {
					if (typeof requests["*BasicLands"] == "undefined") {requests["*BasicLands"] = [];}
					requests["*BasicLands"].push([name]);
					return;
				}
			}
			*/

			if (requests[set][0].length >= 25) { // the limit is 175 requests, but we're limiting ourselves to 25 to be safe
				requests[set].unshift([]);
			}

			requests[set][0].push(name);
		});

		var cards = {};
		var num_requests = 0;

		$.each(requests,function(set,arr) {
			$.each(arr,function(idx,names) {
				var params = {};

				$.each(names,function(idx,name) {
					names[idx] = "!\"" + name + "\""; // Prefix each name with "!" and add quotes " " which makes it an exact match
				})

				params.q = names.join(" or ");

				if (set.indexOf("*") == -1) {
					params.q = "s:" + set + " (" + params.q + ")"; // Add set, and group all cards in brackets
				}

				params.unique = "cards"; // Always find one copy of each card
				params.order = "released"; // Always sort by newest first
				params.dir = "asc";

				var request_string = $.param(params);
				var url = "https://api.scryfall.com/cards/search?" + request_string;

				num_requests++;
				var x = $.get( url, function(data) {
					$.each(data.data,function(idx,card) {
						if (found_cards[card.name] == true) {return;}
						found_cards[card.name] = true;

						processCard(card,cards,amount_by_name[card.name]);
					});
				});

				x.always(function() {
					num_requests--;

					if (num_requests == 0) {
						var not_found = [];
						$.each(found_cards,function(name,b) {
							if (b == false) {
								not_found.push(name);
							}
						});

						if (not_found.length > 0) {
							alert( "Card(s) '" + not_found.join(", ") + "' not found! It's possible the API hasn't been updated yet.");
						}

						displayCards(cards);
						buildShareURL(cards);
					}
				})
			});
		});
	}

	function loadCardsFromURL() {
		var txt = location.hash.substr(1);
		var decompressed = LZString.decompressFromEncodedURIComponent(txt);
		if (decompressed == "" || decompressed == null) {return;}
		
		var split = decompressed.split(",");
		if (split.length == 0) {return;}

		var special_chars = {"b":2,"c":3,"d":4};

		var amount_by_multiverseid = {};
		var requests = [[]];

		var current_amount = 1;
		var literal_amount = false;
		var literal_amount_step = false;
		$.each(split,function(idx,value) {
			if (value == "n") {
				literal_amount = true;
			} else if (typeof special_chars[value] != "undefined") {
				current_amount = special_chars[value];
			} else {
				value = parseInt(value);
				if (literal_amount) literal_amount_step = !literal_amount_step;

				if (literal_amount && literal_amount_step) {
					current_amount = value;
				} else {
					amount_by_multiverseid[value] = current_amount;

					if (requests[0].length >= 60) { // max is 75, limit to 60 to be safe
						requests.unshift([]);
					}

					requests[0].push(value);
				}
			}
		});

		var cards = {};
		var num_requests = 0;
		var fetched_cards = {};

		function convertCard(card) { // convert a few values from one api to the other
			card.multiverse_ids = [card.multiverseid];
			card.image_uris = {"png":card.imageUrl};
			card.type_line = card.type;
			card.scryfall_uri = "http://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=" + card.multiverseid;
		}

		$.each(requests,function(idx,multiverseids) {
			num_requests++;

			var params = {};
			params.identifiers = [];
			$.each(multiverseids,function(idx,m_id) {
				params.identifiers.push({multiverse_id:m_id});
			});

			var url = "https://api.scryfall.com/cards/collection";
			var x = $.ajax({
				url:"https://api.scryfall.com/cards/collection",
				method:"POST",
				data:JSON.stringify(params),
				crossOrigin:true,
				contentType:"application/json",
				dataType:"json",
				xhrFields: {
					withCredentials: false
				},
				success: function(data){
					$.each(data.data,function(idx,card) {
						if (fetched_cards[card.name] == true) {return;}
						fetched_cards[card.name] = true;

						var amount = 1;
						for(var i=0;i<card.multiverse_ids.length;i++) {
							if (amount_by_multiverseid[card.multiverse_ids[i]]) {
								amount = amount_by_multiverseid[card.multiverse_ids[i]];
								break;
							}
						}

						processCard(card,cards,amount);
					});
				}
			});

			x.always(function() {
				num_requests--;

				if (num_requests == 0) {
					displayCards(cards);
					buildCardInputBox(cards);
				}
			})
		});
	}

	btn.click(function() {loadCardsFromInput();});

	if (location.hash != "") {
		loadCardsFromURL();
	}
});