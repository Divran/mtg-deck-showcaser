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

		console.log(query_list);
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

		resizeFakeCards();
		$("#result-card .collapse").collapse("show");
		input.addClass("loaded");
	}

	function processCard(card,cards,lands,get_amount) {
		var name = card.name;
		var amount = get_amount(card) || 1;
		var image = card.imageUrl;
		var type = card.types[0];

		var card_category = "creatures";
		if (type != "Creature") {card_category = "noncreatures";}
		if (type == "Land") {card_category = "lands";}

		if (lands[name] == true) {return;}
		if (card.supertypes && card.supertypes[0] == "Basic" && type == "Land") {
			lands[name] = true;
		}

		var card_url = "http://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=" + card.multiverseid;

		var a = $("<a target='_blank' href='"+card_url+"' class='mtg-card'></a>");
		var img = $("<img src='"+image+"'>");
		img.hide();
		a.append(img);

		if (typeof cards[card_category] == "undefined") {cards[card_category] = [];}
		cards[card_category].push({
			name: name,
			amount: amount,
			image: image,
			a: a,
			cmc: card.cmc,
			multiverseid:card.multiverseid,
			'set': card.set
		});
	}

	function loadCardsFromInput() {
		var txt = input.val().trim();
		var lines = txt.split("\n");

		var requests = {};
		var amount_by_name = {};

		$.each(lines,function(row,line) {
			line = line.trim();
			try {
				var re = /^(\d*) (.*?) \((.*?)\) ?(\d*)?$/i;
				var match = line.match(re);

				var amount = parseInt(match[1]);
				var name = match[2];
				var set = match[3];
				//var dunno = match[4]; // just ignore it I guess
			} catch(e) {
				alert("Error parsing deck: " + e);
			}

			amount_by_name[name] = amount;

			if (typeof requests[set] == "undefined") {
				requests[set] = [[]];
			}

			if (requests[set][0].length >= 50) { // the limit is 100 requests, but we're limiting ourselves to 50 to be safe
				requests[set].unshift([]);
			}

			requests[set][0].push(name);
		});

		var cards = {};
		var num_requests = 0;

		$.each(requests,function(set,arr) {
			$.each(arr,function(idx,names) {
				var request_string = $.param({name:names.join("|"),set:set});
				var url = "https://api.magicthegathering.io/v1/cards?" + request_string;

				var lands = {};

				num_requests++;
				var x = $.get( url, function(data) {
					$.each(data.cards,function(idx,card) {
						processCard(card,cards,lands,function(c) {
							return amount_by_name[c.name];
						});
					});
				});

				x.always(function() {
					num_requests--;

					if (num_requests == 0) {
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

					if (requests[0].length >= 100) {
						requests.unshift([]);
					}

					requests[0].push(value);
				}
			}
		});

		var cards = {};
		var num_requests = 0;

		$.each(requests,function(idx,multiverseids) {
			var request_string = $.param({multiverseid:multiverseids.join("|")});
			var url = "https://api.magicthegathering.io/v1/cards?" + request_string;

			var lands = {};

			num_requests++;
			var x = $.get( url, function(data) {
				$.each(data.cards,function(idx,card) {
					processCard(card,cards,lands,function(c) {
						return amount_by_multiverseid[c.multiverseid];
					});
				});
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