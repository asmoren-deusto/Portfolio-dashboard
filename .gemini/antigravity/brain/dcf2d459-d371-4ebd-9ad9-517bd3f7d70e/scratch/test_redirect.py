import urllib.request

url = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG_6LWdMtHS_bbzPRdz_eAX1-y11IY4AzL8QLpcZtKh5pAa80E8REwQllwOAqVGGeo4gUypTlwOhRWLKWvMXm6BrGpbzpVIgFB4RDgZdqrpTlMyWwl3WHwiXPcrAiyCSdIWo0t3ImA8bp4fXFh56mTZQcRCmINLwKGRgUolNDQFDa2NtE-o-JsCArGr94_iwjC_msEbNG-2p5_2n_ugRBlnw6IlqVyRQGigg7NpDHjQJ4l4x_qb_a7nxlPV9kv1JYJaD0UNVM9Q6NefkQ=='
headers = {'User-Agent': 'Mozilla/5.0'}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as r:
    print('Final URL:', r.geturl())
