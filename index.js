const axios = require('axios');
const _ = require('lodash');

const METRICS_QUERY_URI = 'http://localhost:8983/solr/system_metrics/query';
const METRICS_UPDATE_URI = 'http://localhost:8983/solr/system_metrics/update?commitWithin=1000&overwrite=true&wt=json';

// DELETE CURL
// curl -X POST "http://localhost:8983/solr/gettingstarted/update?commit=true" -H "Content-Type: application/json" --data-binary '{"delete": {"":"55555555-4778-4ed3-b6fd-09d525e51234', '12345678-4778-4ed3-b6fd-09d525e55678"}}'

const fakeHostIds = ['55555555-4778-4ed3-b6fd-09d525e51234', '12345678-4778-4ed3-b6fd-09d525e55678', '77777777-4778-4ed3-b6fd-09d525e59876'];

const LATEST_ROWS_URI = `${METRICS_QUERY_URI}?q=type_s:latest&rows=200&sort=timestamp_tdt%20desc`
const LATEST_HOSTS_URI = `${METRICS_QUERY_URI}?q=type_s:latest&fq=view_s:(host)&rows=200&sort=timestamp_tdt%20desc`
const HISTORY_HOSTS_URI = `${METRICS_QUERY_URI}?q=type_s:history&fq=view_s:(host)&rows=200&sort=timestamp_tdt%20desc`

http://localhost:8983/solr/system_metrics/update?_=1539125315497&commitWithin=1000&overwrite=true&wt=json

axios.get(LATEST_HOSTS_URI).then((response) => {
	console.log(response);
	const docs = response.data.response.docs;
	const nowUtc = (new Date()).toISOString();
	fakeHostIds.forEach((id) => {
		const existingHost = _.find(docs, { node_s: id });
		if (existingHost) {
			console.log('Host exists');
			console.log('===============');
			console.log(existingHost);
			delete existingHost['_version_'];
			existingHost.timestamp_tdt = nowUtc;
			updateMetric(existingHost);

		} else {
			const newLatestHost = getHostRecord(id, nowUtc, 'latest');
			console.log(newLatestHost);
			updateMetric(newLatestHost);

		}
	});
});

console.log("-------Filling history-------");
fakeHostIds.forEach((id) => {
	axios.get(`${HISTORY_HOSTS_URI}&fq=node_s:(${id})`)
		.then((response) => {
			const docs = response.data.response.docs;

			const now = new Date();
			let newDocs = [];
			let date;
			if (docs.length === 0) {
				const someTimeAgo = new Date((new Date()).setHours(now.getHours() - 72));
				console.log('someTimeAgo: ' + someTimeAgo.toISOString());
				date = new Date(someTimeAgo);
			} else {
				date = new Date(docs[0].timestamp_tdt);
			}

			let previousRandomCpuUsage = 15.68212890625;
			let previousRandomCpuUtilization = 0.6056742907136607;
			let counter = 0;
			while (date < now) {
				counter++;
				let cpuUsageModifier = 5;
				let cpuUtilizationModifier = .2;
				if (_.random(0, 100) > 90) {
					cpuUsageModifier = 30;
					cpuUtilizationModifier = .4;
				}

				let newCpuUsage = _.random(_.max([previousRandomCpuUsage - cpuUsageModifier, .15]), previousRandomCpuUsage + cpuUsageModifier, true);
				let newCpuUtilization = _.random(_.max([previousRandomCpuUtilization - cpuUtilizationModifier, .015]), _.min([previousRandomCpuUsage + cpuUtilizationModifier, .98]), true);
				const host = getHostRecord(id, date.toISOString(), 'history', newCpuUsage, newCpuUtilization);
				newDocs.push(host);

				if (counter % 20 === 0) {
					console.log(host.node_s + '-' + host.timestamp_tdt);
				}
				date.setSeconds(date.getSeconds() + 30);
			}
			console.log(newDocs.length);
			updateMetric(newDocs).then((response) => {
				console.log('Metric inserted');
			});

		});
})

function updateMetric(record) {
	let data = _.isArray(record) ? record : [record];
	return axios({
		method: 'POST',
		url: METRICS_UPDATE_URI,
		data
	}).then((response) => {
		console.log('Latest record inserted');
		console.log('================');
		console.log(response);
		return response;
	}).catch((error) => {
		console.log(error);
		throw error;
	});
}

function getHostRecord(nodeId, timestampIso, metricType, cpuLoad = 15.68212890625, cpuUtilization = 0.32) {
	return {
		"host_uptime_l": 117530,
		"addresses_ss": ["10.0.0.43"],
		"network_tcp_connection_resets_l": 0,
		"log_shipper_host_s": "local",
		"load_average_d": cpuLoad,
		"disk_free_l": 69608636416,
		"network_outbound_total_l": 181,
		"network_tcp_bad_segments_l": 0,
		"memory_total_l": 17179869184,
		"os_name_s": "Mac OS X",
		"file_descriptors_max_l": 10240,
		"log_shipper_file_s": "blah/var/log/metrics.log",
		"view_s": "host",
		"network_tcp_failed_connection_attempts_l": 0,
		"network_tcp_resets_sent_l": -1,
		"memory_free_l": 886079488,
		"agent_uptime_l": 62269,
		"cpu_load_d": cpuUtilization,
		"swap_total_l": 7516192768,
		"file_descriptors_open_l": 52,
		"os_arch_s": "x86_64",
		"processors_l": 8,
		"log_shipper_type_s": "metrics",
		"type_s": metricType,
		"network_inbound_total_l": 33,
		"os_version_s": "10.13.6",
		"virtual_memory_committed_l": 6282428416,
		"timestamp_tdt": timestampIso, // e.g."2018-09-25T00:34:41.110Z",
		"node_s": nodeId,
		"swap_free_l": 489422848,
		"disk_total_l": 499963170816
	};
}

