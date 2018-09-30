$(document).ready(function() {
	var btn = $( "#input-card .btn" );
	var input = $( "#input-card #input" );
	var result = $( "#result-card #result-body" );
	input.focus(function() {
		input.select();
		input.removeClass("loaded");
	});

	function loadCards() {
		var txt = input.val();
		var lines = txt.split("\n");

		var requests = {};
		var amount_by_name = {};

		$.each(lines,function(row,line) {
			line = line.trim();
			var re = /^(\d*) (.*?) \((.*?)\) (\d*)$/i;
			var match = line.match(re);

			var amount = match[1];
			var name = match[2];
			var set = match[3];
			//var dunno = match[4]; // just ignore it I guess

			amount_by_name[name] = amount;

			if (typeof requests[set] == "undefined") {
				requests[set] = [[]];
			}

			if (requests[set][0].length >= 100) {
				requests[set].unshift([]);
			}

			requests[set][0].push(name);
		});

		result.empty();
		$("#result-card .collapse").collapse("show");
		input.addClass("loaded");

		var cards = {};

		$.each(requests,function(set,arr) {
			$.each(arr,function(idx,names) {
				var request_string = $.param({name:names.join("|"),set:set});
				var url = "https://api.magicthegathering.io/v1/cards?" + request_string;

				var lands = {};

				$.get( url, function(data) {
					$.each(data.cards,function(idx,card) {
						var name = card.name;
						var amount = amount_by_name[name] || 0;
						var image = card.imageUrl;
						var type = card.types[0];

						if (lands[name] == true) {return;}
						if (card.supertypes && card.supertypes[0] == "Basic" && type == "Land") {
							lands[name] = true;
						}

						var card_url = "http://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=" + card.multiverseid;

						var a = $("<a target='_blank' href='"+card_url+"' class='mtg-card'>"+amount+"x "+name+"</a>");
						a.popover({
							html:true,
							content:"<img src='" + image + "'>",
							container:"#result-body",
							placement:"right",
							trigger:"hover",
							animation:false
						});

						result.append([a,"<br>"]);

						/*
						todo later: group cards by type
						if (typeof cards[type]) {cards[type] = [];}
						cards[type].push({
							name: name,
							amount: amount,
							image: image,
							a: a,
							cmc: card.cmc
						});
						*/
					});
				});
			});
		});
	}

	btn.click(function() {loadCards();});
});